import re
import unicodedata
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
WORKBOOK = ROOT / "src" / "docs" / "DADOS CARCERES-v2.xlsx"
OUTPUT = ROOT / "src" / "constants"

NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def normalize_text(value: str) -> str:
    if value is None:
        return ""
    text = str(value)
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.strip()
    text = re.sub(r"\s+", " ", text)
    text = text.upper()
    text = re.sub(r"[^A-Z0-9/ \-]", "", text)
    text = re.sub(r"\s*([/\-])\s*", r"\1", text)
    return text


def clean_text(value: str) -> str:
    if value is None:
        return ""
    text = str(value)
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_shared_strings(zip_file):
    if "xl/sharedStrings.xml" not in zip_file.namelist():
        return []
    xml = ET.fromstring(zip_file.read("xl/sharedStrings.xml"))
    strings = []
    for si in xml.findall("x:si", NS):
        text_nodes = si.findall(".//x:t", NS)
        strings.append("".join(t.text or "" for t in text_nodes))
    return strings


def get_cell_text(cell, shared_strings):
    t = cell.get("t")
    if t == "s":
        value = cell.find("x:v", NS)
        if value is None or value.text is None:
            return ""
        index = int(value.text)
        return shared_strings[index] if 0 <= index < len(shared_strings) else ""
    if t == "inlineStr":
        text_nodes = cell.findall(".//x:t", NS)
        return "".join(t.text or "" for t in text_nodes)
    value = cell.find("x:v", NS)
    if value is not None and value.text is not None:
        return value.text
    text_nodes = cell.findall(".//x:t", NS)
    if text_nodes:
        return "".join(t.text or "" for t in text_nodes)
    return ""


def load_sheet_rows(zip_file, target_path):
    if not target_path.startswith("xl/"):
        target_path = f"xl/{target_path}"
    xml = ET.fromstring(zip_file.read(target_path))
    rows = []
    for row in xml.findall('.//x:sheetData/x:row', NS):
        row_data = {}
        for cell in row.findall('x:c', NS):
            ref = cell.get('r')
            if not ref:
                continue
            col = re.match(r'([A-Z]+)', ref).group(1)
            row_data[col] = get_cell_text(cell, shared_strings)
        rows.append(row_data)
    return rows


def sheet_name_to_target(zip_file):
    workbook_xml = ET.fromstring(zip_file.read('xl/workbook.xml'))
    rels_xml = ET.fromstring(zip_file.read('xl/_rels/workbook.xml.rels'))
    rel_map = {rel.get('Id'): rel.get('Target') for rel in rels_xml.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')}
    sheets = {}
    for sheet in workbook_xml.findall('.//x:sheets/x:sheet', NS):
        rid = sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        name = sheet.get('name')
        if rid and name:
            sheets[name] = rel_map[rid]
    return sheets


def safe_int(value):
    if value is None:
        return None
    try:
        return int(str(value).strip())
    except ValueError:
        return None


def fmt_string(value: str) -> str:
    return value.replace('"', '\\"')


def render_array(items, indent=2):
    lines = []
    for item in items:
        if isinstance(item, dict):
            lines.append(render_object(item, indent + 2) + ',')
        else:
            lines.append(' ' * indent + str(item) + ',')
    return '[\n' + '\n'.join(lines) + '\n]'


def render_object(obj, indent=2):
    lines = []
    for key, value in obj.items():
        if isinstance(value, str):
            lines.append(' ' * indent + f'{key}: "{fmt_string(value)}",')
        elif isinstance(value, list):
            arr = '[{}]'.format(', '.join(f'"{fmt_string(x)}"' for x in value))
            lines.append(' ' * indent + f'{key}: {arr},')
        else:
            lines.append(' ' * indent + f'{key}: {value},')
    return '{\n' + '\n'.join(lines) + '\n' + ' ' * (indent - 2) + '}'


def write_ts(path: Path, header: str, body: str):
    path.write_text(f"{header}\n{body}\n", encoding="utf-8")
    print(f"Wrote {path}")


def build_nucleo_lookup(nucleo_rows):
    nucleos = []
    for row in nucleo_rows:
        code = safe_int(row.get('L'))
        nome = clean_text(row.get('M') or row.get('C') or '')
        if code is None or not nome:
            continue
        nucleos.append({'id': code, 'nome': nome})
    # Sort by id to preserve the explicit codes from the sheet.
    nucleos.sort(key=lambda item: item['id'])
    return nucleos


def build_school_lookup(sheet1_rows, escola_etapas):
    schools = []
    by_code = {}
    for row in sheet1_rows:
        code = safe_int(row.get('A'))
        if code is None:
            continue
        nome = clean_text(row.get('B') or '')
        if not nome:
            continue
        nucleo = normalize_text(row.get('C') or '')
        schools.append({'id': code, 'nome': nome, 'nucleoNome': nucleo})
        by_code[code] = nome
    return schools, by_code


def format_ts_value(value):
    if isinstance(value, str):
        return f'"{fmt_string(value)}"'
    return str(value)


def render_object(obj, indent=2):
    lines = []
    for key, value in obj.items():
        if isinstance(value, str):
            lines.append(' ' * indent + f'{key}: "{fmt_string(value)}",')
        elif isinstance(value, list):
            inner = ', '.join(f'"{fmt_string(v)}"' for v in value)
            lines.append(' ' * indent + f'{key}: [{inner}],')
        else:
            lines.append(' ' * indent + f'{key}: {value},')
    return '{\n' + '\n'.join(lines) + '\n}'


def main():
    global shared_strings
    with zipfile.ZipFile(WORKBOOK, 'r') as zf:
        shared_strings = parse_shared_strings(zf)
        sheet_targets = sheet_name_to_target(zf)

        sheet1 = load_sheet_rows(zf, sheet_targets['01-NÚCLEO-ESCOLA'])
        sheet2 = load_sheet_rows(zf, sheet_targets['02-ESCOLAS-ETAPA'])
        sheet3 = load_sheet_rows(zf, sheet_targets['03-LINHAS'])
        sheet4 = load_sheet_rows(zf, sheet_targets['04-LINHAS-ESCOLAS'])

    nucleos = build_nucleo_lookup(sheet1)
    nucleo_by_name = {normalize_text(item['nome']): item['id'] for item in nucleos}

    escola_etapas = defaultdict(list)
    escola_names_by_code = {}
    for row in sheet2:
        code = safe_int(row.get('A'))
        if code is None:
            continue
        nome = normalize_text(row.get('B') or '')
        # use clean_text for display values and capture the NÍVEL column (F)
        etapa_raw = clean_text(row.get('E') or '')
        nivel_raw = clean_text(row.get('F') or '')
        cod_etpa = safe_int(row.get('D'))
        if nome and etapa_raw:
            escola_names_by_code[code] = nome
            # formatted label: "<ETAPA> - <Nível>" (title-cased nível)
            formatted = f"{etapa_raw} - {nivel_raw.title()}" if nivel_raw else etapa_raw
            # keep order by COD ETPA (D) and avoid duplicates
            if not any(fmt == formatted for _, fmt in escola_etapas[code]):
                escola_etapas[code].append((cod_etpa or 0, formatted))

    schools = []
    school_name_to_code = {}
    for row in sheet1:
        code = safe_int(row.get('A'))
        if code is None:
            continue
        nome = normalize_text(row.get('B') or '')
        if not nome:
            continue
        nucleo = normalize_text(row.get('C') or '')
        if not nucleo:
            continue
        nucleo_id = nucleo_by_name.get(nucleo)
        if nucleo_id is None:
            raise RuntimeError(f"Missing núcleo '{nucleo}' for school {nome}")
        # preserve the original order from sheet (COD ETPA in column D)
        etapas = [fmt for _, fmt in sorted(escola_etapas.get(code, []), key=lambda x: x[0])]
        schools.append({
            'id': code,
            'nome': nome,
            'nucleoId': nucleo_id,
            'etapas': etapas,
            'linhas': [],
        })
        school_name_to_code[nome] = code

    for code, nome in escola_names_by_code.items():
        normalized = normalize_text(nome)
        if normalized and normalized not in school_name_to_code:
            school_name_to_code[normalized] = code

    def find_school_code(name):
        if not name:
            return None
        norm = normalize_text(name)
        if norm in school_name_to_code:
            return school_name_to_code[norm]
        candidates = [code for candidate, code in school_name_to_code.items() if norm == candidate]
        if candidates:
            return candidates[0]
        candidates = [code for candidate, code in school_name_to_code.items() if norm in candidate or candidate in norm]
        if len(candidates) == 1:
            return candidates[0]
        return None

    line_map = {}
    for row in sheet3:
        code = safe_int(row.get('A'))
        if code is None:
            continue
        name = normalize_text(row.get('B') or '')
        if not name:
            continue
        nucleo = normalize_text(row.get('G') or '')
        nucleo_id = nucleo_by_name.get(nucleo)
        if nucleo_id is None:
            raise RuntimeError(f"Missing núcleo '{nucleo}' for linha {code}")
        line_map[code] = {
            'id': code,
            'nome': name,
            'motorista': normalize_text(row.get('D') or ''),
            'telefone': normalize_text(row.get('E') or ''),
            'arquivoGPX': '',
            'nucleoId': nucleo_id,
            'turno': normalize_text(row.get('F') or ''),
        }

    school_lines = defaultdict(set)
    unmatched = set()
    existing_school_ids = {school['id'] for school in schools}
    next_school_id = max(existing_school_ids) if existing_school_ids else 0
    synthetic_schools = {}

    def cleanup_name(text):
        return re.sub(r"\s+", " ", str(text or "").strip())

    for row in sheet4:
        line_id = safe_int(row.get('A'))
        school_name = row.get('H') or row.get('C') or ''
        if line_id is None or not school_name:
            continue
        code = find_school_code(school_name)
        if code is None:
            norm = normalize_text(school_name)
            if norm in synthetic_schools:
                code = synthetic_schools[norm]
            else:
                next_school_id += 1
                line_info = line_map.get(line_id)
                nucleo_id = line_info['nucleoId'] if line_info else None
                code = next_school_id
                schools.append({
                    'id': code,
                    'nome': cleanup_name(school_name),
                    'nucleoId': nucleo_id or 0,
                    'etapas': [],
                    'linhas': [],
                })
                school_name_to_code[norm] = code
                synthetic_schools[norm] = code
        if code is None:
            unmatched.add(normalize_text(school_name))
            continue
        school_lines[code].add(line_id)

    if unmatched:
        print('WARNING: could not match the following school names from sheet4:')
        for name in sorted(unmatched):
            print(' -', name)

    for school in schools:
        lines = sorted(school_lines.get(school['id'], []))
        school['linhas'] = [str(line_id) for line_id in lines]

    nucleos_header = 'export const NUCLEOS = '
    linhas_header = 'import { Linha } from "@/types/cadastro"\n\nexport const LINHAS: Linha[] = '
    escolas_header = 'import { Escola } from "@/types/cadastro"\n\nexport const ESCOLAS: Escola[] = '

    nucleos_body = render_array(nucleos)
    linhas_body = render_array([{
        'id': item['id'],
        'nome': item['nome'],
        'motorista': item['motorista'],
        'telefone': item['telefone'],
        'arquivoGPX': item['arquivoGPX'],
        'nucleoId': item['nucleoId'],
        'turno': item['turno'],
    } for item in sorted(line_map.values(), key=lambda x: x['id'])])
    escolas_body = render_array([{
        'id': school['id'],
        'nome': school['nome'],
        'nucleoId': school['nucleoId'],
        'etapas': school['etapas'],
        'linhas': school['linhas'],
    } for school in sorted(schools, key=lambda x: x['id'])])

    OUTPUT.mkdir(exist_ok=True)
    write_ts(OUTPUT / 'nucleos.ts', '// GENERATED FROM src/docs/DADOS CARCERES-v2.xlsx', nucleos_header + nucleos_body)
    write_ts(OUTPUT / 'linhas.ts', '// GENERATED FROM src/docs/DADOS CARCERES-v2.xlsx', linhas_header + linhas_body)
    write_ts(OUTPUT / 'escolas.ts', '// GENERATED FROM src/docs/DADOS CARCERES-v2.xlsx', escolas_header + escolas_body)


if __name__ == '__main__':
    main()
