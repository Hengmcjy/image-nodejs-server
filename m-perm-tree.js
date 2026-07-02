const mongoose = require("mongoose");

// tree ต้นแบบ — 1 document ต่อ app
// nodes มีหน้าตาเหมือน TreeNode ของ PrimeNG เลย feed ตรงๆ ได้
//
// ตัวอย่าง document:
// {
//   appId: "garment_app",
//   nodes: [
//     { key: "tools",          label: "เครื่องมือ",      type: "menu", children: [
//         { key: "tools__image-upload", label: "Image Upload", type: "page", children: [
//             { key: "tools__image-upload__btn__upload", label: "อัปโหลดรูป", type: "button", children: [] }
//         ]}
//     ]},
//     { key: "hr", label: "HR", type: "menu", children: [
//         { key: "hr__emp-register", label: "ทะเบียนพนักงาน", type: "page", children: [
//             { key: "hr__emp-register__tab__info",     label: "ข้อมูลทั่วไป",         type: "tab",    children: [] },
//             { key: "hr__emp-register__tab__pay",      label: "ค่าจ้าง",              type: "tab",    children: [] },
//             { key: "hr__emp-register__tab__expenses", label: "ค่าใช้จ่ายรับเข้า",   type: "tab",    children: [] },
//             { key: "hr__emp-register__btn__save",     label: "บันทึก",               type: "button", children: [] }
//         ]},
//         { key: "hr__employees",         label: "รายชื่อพนักงาน",   type: "page", children: [] },
//         { key: "hr__statement-summary", label: "สรุปสลิปรายเดือน", type: "page", children: [] }
//     ]}
//   ]
// }

const permTreeSchema = new mongoose.Schema({
  appId: { type: String, required: true, unique: true },
  nodes: { type: Array, default: [] },   // Array ของ node (โครงสร้างเหมือน TreeNode)
  updatedAt: { type: Date },
});

module.exports = mongoose.model("PermTree", permTreeSchema);
