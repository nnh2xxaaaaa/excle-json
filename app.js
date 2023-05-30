import Input from "./im.js";
const fs = require("fs");
const ExcelJS = require("exceljs");
const wb = new ExcelJS.Workbook();
const fileName = "input.xlsx";

wb.xlsx.readFile(fileName).then(() => {
  console.log(Input);
  const ws = wb.getWorksheet(5);
  ws.getRows().map((x) => console.log(x));

  const c1 = ws.getRow(2);
  const c2 = ws.getColumn(5);
  const filter_tracking_same = new Set(c2.values);
  filter_tracking_same.forEach((e, i) => {
    if (e === undefined || e === "Shipto party number") {
      filter_tracking_same.delete(e);
    }
  });

  const dict = {
    solutions: [
      {
        route: [],
      },
    ],
  };

  filter_tracking_same.forEach((e) => {
    dict.solutions[0].route.push({
      element: [
        {
          location_code: e,
        },
      ],
    });
  });

  const jsonData = JSON.stringify(dict);

  fs.writeFile("data.json", jsonData, "utf8", (err) => {
    if (err) {
      console.error("An error occurred:", err);
    } else {
      console.log("JSON file has been created.");
    }
  });
});

// const fs = require("fs");
// const ExcelJS = require("exceljs");
// const wb = new ExcelJS.Workbook();
// const fileName = "input.xlsx";
// wb.xlsx.readFile(fileName).then(() => {
//   const ws = wb.getWorksheet(5);
//   const all_row = ws.getRows(2, 10);
//   all_row.forEach((x, i) => {
//     console.log(x.values, i);
//   });
// });
