import inputData from "./newInputData.json" assert { type: "json" };
import fs from "fs/promises";
import ExcelJS from "exceljs";

const wb = new ExcelJS.Workbook();
// add file excel

const fileName = "ICD_HCM_8th_demo_(KIEN).xlsx";

wb.xlsx.readFile(fileName).then(() => {
  //select sheet  file in excel
  const ws = wb.getWorksheet(7);

  //select Coloumn
  const filter_Trucking_Number = ws.getColumn(7).values;
  //select Coloumn
  const filter_shipto_party_number = ws.getColumn(6).values;
  //select Coloumn
  const filter_of_total_cbm = ws.getColumn(15).values;
  filter_of_total_cbm.forEach((x) => {
    console.log(x + 1);
  });
  const vehicleWeightToCbm = {};
  inputData.vehicles.forEach((veh) => {
    if (!(veh.vType.typeOfVehicleByCostToDeploy in vehicleWeightToCbm)) {
      vehicleWeightToCbm[veh.vType.typeOfVehicleByCostToDeploy] = veh.cbm;
    } else {
      vehicleWeightToCbm[veh.vType.typeOfVehicleByCostToDeploy] = Math.max(
        veh.cbm,
        vehicleWeightToCbm[veh.vType.typeOfVehicleByCostToDeploy]
      );
    }
  });

  console.log(vehicleWeightToCbm);

  return;

  //sum up the points in 1 car
  const test = [];
  for (let i = 1; i < filter_shipto_party_number.length; i++) {
    if (i >= 2 && filter_Trucking_Number[i] != filter_Trucking_Number[i - 1]) {
      test.push({
        trucking_number: filter_Trucking_Number[i],
        shipto_party_number: [{ location_code: filter_shipto_party_number[i] }],
      });
    } else if (
      i >= 2 &&
      filter_shipto_party_number[i] != filter_shipto_party_number[i - 1] &&
      filter_Trucking_Number[i] == filter_Trucking_Number[i - 1]
    ) {
      test[test.length - 1].shipto_party_number.push({
        location_code: filter_shipto_party_number[i],
      });
    }
  }

  // creat data json
  const dict = {
    solutions: [
      {
        routes: [],
      },
    ],
  };
  // find lat lng
  const findLatLng = (location_code) => {
    return inputData.locations.find((x) => x.locationCode == location_code);
  };
  // add depotcenter
  const findDepot = inputData["locations"];
  const dataDepot = "DEPOT";
  const def = [];
  findDepot.map((x, i) => {
    if (x.lTypes.includes(dataDepot)) {
      def.push({
        location_code: x.locationCode,
        lat: x.lat,
        lng: x.lng,
      });
    }
  });

  // add data from data json
  test.forEach((x, i) => {
    const currentEl = [...def];
    x.shipto_party_number.map((xx) => {
      const location = findLatLng(xx.location_code);
      xx.lat = location?.lat;
      xx.lng = location?.lng;
      currentEl.push(xx);
    });
    dict.solutions[0].routes.push({
      vehicle_code: `ICD_KIEN_DEMO ${x.trucking_number}`,
      elements: currentEl,
    });
  });
  //delete  point overlap
  for (const solution of dict.solutions) {
    for (const route of solution.routes) {
      route.elements = Array.from(
        new Set(route.elements.map(JSON.stringify))
      ).map(JSON.parse);
    }
  }

  // export default file data.json
  const jsonData = JSON.stringify(dict);

  fs.writeFile("ICD_PROVINCE_8th_demo_KIEN.json", jsonData, "utf8")
    .then(() => {
      console.log("JSON file has been created.");
    })
    .catch((err) => {
      console.error("An error occurred:", err);
    });
});
