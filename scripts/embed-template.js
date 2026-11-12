// templates/school-bulk-template.xlsx 를 lib/bulkTemplate.js 로 다시 담습니다.
const fs = require("fs");
const b = fs.readFileSync("templates/school-bulk-template.xlsx").toString("base64");
fs.writeFileSync(
  "lib/bulkTemplate.js",
  "// 학교 일괄 등록 양식(templates/school-bulk-template.xlsx)을 그대로 담은 base64입니다.\n" +
    "// 양식을 바꾸면: node scripts/embed-template.js\n" +
    `export const BULK_TEMPLATE_BASE64 =\n  "${b}";\n`
);
console.log("updated lib/bulkTemplate.js");
