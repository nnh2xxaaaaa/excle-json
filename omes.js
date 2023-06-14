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
  //select Coloumn shipto party number
  const filter_shipto_party_number = ws.getColumn(5).values;
  //select Coloumn trucking numbers
  // const filter_Trucking_Number = ws.getColumn(7).values;
  //select Coloumn Transporter
  const filter_transporter = ws.getColumn(10).values;
  //select Colomun
  const filter_truck_capacity_in_tons = ws.getColumn(9).values;
  // convert garage information + payload

  const filter_carnigabed = ws.getColumn(6).values;
  //select Coloumn trucking numbers

  const filter_Trucking_Number = filter_carnigabed.map((value, index) => {
    return value.split(" ")[0];
  });

  function convertString(str) {
    // Split the string into individual words
    const words = str.split(" ");

    // Convert each word to lowercase and capitalize the first letter
    const convertedWords = words.map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });

    // Join the converted words back into a single string
    let convertedString;
    if (convertedWords.join(" ") === "Thai Ha") {
      convertedString = convertedWords.join(" ") + " YMNorth-";
    } else {
      // Join the converted words back into a single string
      convertedString = convertedWords.join(" ") + "_YMNorth-";
    }

    return convertedString;
  }
  // Vehicle Type Synthesis
  const typeOfVehicle = [];
  for (let i = 2; i < filter_transporter.length; i++) {
    typeOfVehicle.push(
      `${convertString(filter_transporter[i])}${
        filter_truck_capacity_in_tons[i]
      }T`
    );
  }

  // console.log(typeOfVehicle);

  const groupofVehicles = [];
  // ground filter_shipto_party_number , filter_shipto_party_number
  function groupofVehicle(filter_shipto_party_number, filter_Trucking_Number) {
    for (let i = 1; i < filter_shipto_party_number.length; i++) {
      if (
        i >= 2 &&
        filter_Trucking_Number[i] != filter_Trucking_Number[i - 1]
      ) {
        groupofVehicles.push({
          trucking_number: filter_Trucking_Number[i],
          shipto_party_number: [
            { location_code: filter_shipto_party_number[i] },
          ],
        });
      } else if (
        i >= 2 &&
        filter_shipto_party_number[i] != filter_shipto_party_number[i - 1] &&
        filter_Trucking_Number[i] == filter_Trucking_Number[i - 1]
      ) {
        groupofVehicles[groupofVehicles.length - 1].shipto_party_number.push({
          location_code: filter_shipto_party_number[i],
        });
      }
    }
  }
  groupofVehicle(filter_shipto_party_number, filter_Trucking_Number);

  // Create an object to store merged arrays
  const mergedData = {};

  // Iterate over each object in the data array
  groupofVehicles.forEach((obj) => {
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

  // ground car
  const copy_filter_trucking_number = filter_Trucking_Number.slice(2);
  const copy_filter_typeOfVehicle = typeOfVehicle;

  const carTrans = [];
  for (let i = 0; i < copy_filter_trucking_number.length; i++) {
    if (
      i >= 0 &&
      copy_filter_trucking_number[i] !== copy_filter_trucking_number[i - 1]
    ) {
      carTrans.push({
        trucking_number: copy_filter_trucking_number[i],
        shipto_party_number: [copy_filter_typeOfVehicle[i]],
      });
    } else if (
      i >= 0 &&
      copy_filter_typeOfVehicle[i] !== copy_filter_typeOfVehicle[i - 1] &&
      copy_filter_trucking_number[i] === copy_filter_trucking_number[i - 1]
    ) {
      carTrans[carTrans.length - 1].shipto_party_number.push({
        location_code: copy_filter_typeOfVehicle[i],
      });
    }
  }

  const mergedMap = {};

  carTrans.forEach((obj) => {
    const { trucking_number, shipto_party_number } = obj;

    if (mergedMap[trucking_number]) {
      if (Array.isArray(mergedMap[trucking_number].shipto_party_number)) {
        mergedMap[trucking_number].shipto_party_number.push(
          ...shipto_party_number
        );
      } else {
        mergedMap[trucking_number].shipto_party_number = [
          mergedMap[trucking_number].shipto_party_number,
          ...shipto_party_number,
        ];
      }
    } else {
      mergedMap[trucking_number] = { trucking_number, shipto_party_number };
    }
  });

  // Remove duplicate values within shipto_party_number arrays
  Object.values(mergedMap).forEach((obj) => {
    if (Array.isArray(obj.shipto_party_number)) {
      obj.shipto_party_number = Array.from(new Set(obj.shipto_party_number));
    }
  });

  const marCar = Array.from(Object.values(mergedMap));
  const cargr = marCar.map((obj) => obj.shipto_party_number.join(""));

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
      typeOfVehicle: cargr[i],
      vehicle_code: ` ----${x.trucking_number}`,
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

  function filterElements(elements) {
    return elements.filter(
      (element) => element.lat !== undefined && element.lng !== undefined
    );
  }

  // Loop through the object and filter elements
  dict.solutions.forEach((solution) => {
    solution.routes.forEach((route) => {
      route.elements = filterElements(route.elements);
    });
  });

  const jsonData = JSON.stringify(dict);

  fs.writeFile("st_206.json", jsonData, "utf8")
    .then(() => {
      console.log("JSON file has been created.");
    })
    .catch((err) => {
      console.error("An error occurred:", err);
    });
});