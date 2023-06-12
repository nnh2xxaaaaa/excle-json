import inputData from "./newInputData.json" assert { type: "json" };
import newOutputData from "./newInputData.json" assert { type: "json" };
import fs from "fs/promises";
import ExcelJS from "exceljs";

const wb = new ExcelJS.Workbook();
// add file excel

const fileName = "Actual_test_206.xlsx";

wb.xlsx.readFile(fileName).then(() => {
  //select sheet  file in excel
  const ws = wb.getWorksheet(3);
  //select Coloumn
  const filter_shipto_party_number = ws.getColumn(5).values;
  //select Coloumn
  const filter_Trucking_Number = ws.getColumn(7).values;

  //sum up the points in 1 car

  const groups = {};
  for (let i = 2; i < filter_Trucking_Number.length; i++) {
    const tt = filter_Trucking_Number[i];
    const x = filter_shipto_party_number[i];

    if (groups.hasOwnProperty(tt)) {
      if (!groups[tt].includes(x)) {
        groups[tt].push(x);
      }
    } else {
      groups[tt] = [x];
    }
  }
  console.log(groups);

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
  console.log(test);

  // Create an object to store merged arrays
  const mergedData = {};

  // Iterate over each object in the data array
  test.forEach((obj) => {
    const { trucking_number, shipto_party_number } = obj;

    // If the trucking_number already exists in the mergedData object, append the shipto_party_number
    if (mergedData[trucking_number]) {
      mergedData[trucking_number].push(...shipto_party_number);
    } else {
      // Otherwise, create a new key-value pair with the trucking_number and shipto_party_number array
      mergedData[trucking_number] = shipto_party_number;
    }
  });

  // Convert the mergedData object back to an array
  const mergedArray = Object.entries(mergedData).map(
    ([trucking_number, shipto_party_number]) => ({
      trucking_number,
      shipto_party_number,
    })
  );

  // Output the merged array
  // console.log(mergedArray);

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
  const findDepot = newOutputData["locations"];
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

  // // add data from data json
  mergedArray.forEach((x, i) => {
    const currentEl = [...def];
    x.shipto_party_number.map((xx) => {
      const location = findLatLng(xx.location_code);
      xx.lat = location?.lat;
      xx.lng = location?.lng;
      currentEl.push(xx);
    });
    dict.solutions[0].routes.push({
      vehicle_code: x.trucking_number,
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

  const jsonData = JSON.stringify(dict);

  fs.writeFile("Actual_Test_206.json", jsonData, "utf8")
    .then(() => {
      console.log("JSON file has been created.");
    })
    .catch((err) => {
      console.error("An error occurred:", err);
    });
});
