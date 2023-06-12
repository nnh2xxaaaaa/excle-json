import inputData from "./newInputData.json" assert { type: "json" };
import newOutputData from "./newInputData.json" assert { type: "json" };
import fs from "fs/promises";
import ExcelJS from "exceljs";

const wb = new ExcelJS.Workbook();
// add file excel

const fileName = "input.xlsx";

wb.xlsx.readFile(fileName).then(() => {
  //select sheet  file in excel
  const ws = wb.getWorksheet(5);
  //select Coloumn
  const filter_shipto_party_number = ws.getColumn(5).values;
  //select Coloumn
  const filter_Trucking_Number = ws.getColumn(6).values;

  //sum up the points in 1 car
  const test = [];
});
