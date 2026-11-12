import JSZip from "jszip";
import { BULK_TEMPLATE_BASE64 } from "@/lib/bulkTemplate";
import { BULK_PASSWORD, REGIONS } from "@/lib/options";
import { getSchools } from "@/lib/store";

export const dynamic = "force-dynamic";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cell = (ref, text, style) =>
  `<c r="${ref}"${style ? ` s="${style}"` : ""} t="inlineStr"><is><t>${esc(text)}</t></is></c>`;

// 일괄 등록 양식의 '학교 목록' 시트 2행부터 [지역, 학교명, 비밀번호]를 채워 내려줍니다.
// 양식의 서식·지역 목록 검사·안내 시트는 그대로 둡니다.
export async function GET() {
  const schools = await getSchools();
  const order = Object.fromEntries(REGIONS.map((r, i) => [r, i]));
  schools.sort(
    (a, b) => (order[a.region] ?? 99) - (order[b.region] ?? 99) || a.school.localeCompare(b.school, "ko")
  );

  const zip = await JSZip.loadAsync(Buffer.from(BULK_TEMPLATE_BASE64, "base64"));
  const path = "xl/worksheets/sheet1.xml";
  let xml = await zip.file(path).async("string");

  const rowXml = (r, s) =>
    `<row r="${r}" spans="1:3" x14ac:dyDescent="0.25">` +
    cell(`A${r}`, s.region) + cell(`B${r}`, s.school) + cell(`C${r}`, BULK_PASSWORD, 2) +
    `</row>`;

  schools.forEach((s, i) => {
    const r = i + 2;
    const re = new RegExp(`<row r="${r}"[^>]*>.*?</row>`);
    if (re.test(xml)) xml = xml.replace(re, rowXml(r, s));
    else xml = xml.replace("</sheetData>", rowXml(r, s) + "</sheetData>"); // 양식의 500줄을 넘는 경우
  });
  const last = Math.max(501, schools.length + 1);
  if (last > 501) {
    xml = xml.replace(/<dimension ref="A1:C\d+"\/>/, `<dimension ref="A1:C${last}"/>`);
    xml = xml.replace(/sqref="A2:A\d+"/, `sqref="A2:A${last}"`);
  }
  zip.file(path, xml);

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const d = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
  const name = `학교_일괄등록_${d}.xlsx`;
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="school-bulk-${d}.xlsx"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
