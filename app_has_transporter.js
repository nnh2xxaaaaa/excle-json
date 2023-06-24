import inputData from "./newInputData.json" assert { type: "json" };
import fs from "fs/promises";
import ExcelJS from "exceljs";

const wb = new ExcelJS.Workbook();
const fileName = "YMNorth_actual_0th_edit.xlsx";

wb.xlsx.readFile(fileName).then(() => {
  //select sheet  file in excel
  const ws = wb.getWorksheet('YMN');
  //select column shipto party number (customer location code)
  const filter_shipto_party_number = ws.getColumn(6).values;
  //select column vehicle weight
  const filter_truck_capacity_in_tons = ws.getColumn(9).values;
  //select column transporter (type of vendor ex: NHAT LONG)
  const filter_transporter = ws.getColumn(10).values;
  //select column trucking number (truck plate)
  const filter_add_truckingnumber = ws.getColumn(7).values;
  // console.log(filter_add_truckingnumber);

  const filter_cbm = ws.getColumn(18).values;

  const filter_Trucking_Number = filter_add_truckingnumber.map(
    (value, index) => {
      return value.toString().toLocaleUpperCase().split(" ")[0].toLocaleLowerCase();
    }
  );
  console.log(filter_Trucking_Number);

  // return;


  function convertString(str) {
    const words = str.toString().split(" ");
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
      convertedString = `${convertedWords.join(" ")}_YMNorth-`;
    }
    return convertedString;
  }

  //format: { 'TRUCKING_NUMBER' : ['LOCATION_CODE',...], }
  const truckingRoute = {};
  //format: { 'TRUCKING_NUMBER' : 'VEHICLE_TYPE',}
  const truckingNumberToVehicleType = {};
  //loop through every row and group trucking number, truck's delivery location code and remove duplicates
  var totalCbm = 0;
  for (let i = 2; i < filter_Trucking_Number.length; i++) {
    let thisTruckingNumber = filter_Trucking_Number[i];
    //creating trucking number to vehicle type dictionary
    if (!(filter_Trucking_Number[i] in truckingNumberToVehicleType)) {
      truckingNumberToVehicleType[thisTruckingNumber] =
        convertString(filter_transporter[i]) +
        filter_truck_capacity_in_tons[i] +
        "T";
    }
    //grouping route
    if (!(thisTruckingNumber in truckingRoute)) {
      truckingRoute[thisTruckingNumber] = [filter_shipto_party_number[i]];
      truckingRoute[thisTruckingNumber].total_cbm_load = filter_cbm[i];
    } else if (
      !truckingRoute[thisTruckingNumber].includes(filter_shipto_party_number[i])
    ) {
      truckingRoute[thisTruckingNumber].push(filter_shipto_party_number[i]);
      truckingRoute[thisTruckingNumber].total_cbm_load += filter_cbm[i];
    } else {
      truckingRoute[thisTruckingNumber].total_cbm_load += filter_cbm[i];
    }
  }
  console.log(truckingNumberToVehicleType);
  const updatedObject = {};
  const convertedObject = {};

  for (const key in truckingNumberToVehicleType) {
    const value = truckingNumberToVehicleType[key].replace(/^_/, "").trim();
    const updatedValue = value.replace(/ _/g, "_");
    updatedObject[key] = value;
    convertedObject[key] = updatedValue;
  }

  console.log(convertedObject);
  // console.log(truckingNumberToVehicleType);

  let finalRoute = [];
  for (let key in truckingRoute) {
    let depot = [inputData["depots"][0]["depotCode"]];
    let routeFormat = {
      // check value for customs
      vehicleType: convertedObject[key],
      total_cbm_load: truckingRoute[key].total_cbm_load,
      elements: [...depot, ...truckingRoute[key]],
    };
    finalRoute.push(routeFormat);
  }

  // console.log(finalRoute);

  let outputDict = { solutions: [{ routes: [] }] };
  finalRoute.forEach((route) => {
    let routeFormat = {
      vehicle_code: null,
      vehicle_cbm: 0,
      total_cbm_load: route.total_cbm_load,
      total_cost: 0,
      main_cost: 0,
      additional_cost: 0,
      elements: [],
    };
    routeFormat.vehicle_code = route.vehicleType;
    route.elements.forEach((el) => {
      let elementFormat = {
        location_code: null,
        location_type: null,
      };
      elementFormat.location_code = el;
      routeFormat.elements.push(elementFormat);
    });

    outputDict.solutions[0].routes.push(routeFormat);
  });

  //main fee
  outputDict.solutions.forEach((solution) => {
    solution.routes.forEach((route) => {
      let thisVehicle = route.vehicle_code;
      let distanceDict = {};
      for (let i = 1; i < route.elements.length; i++) {
        distanceDict[route.elements[i].location_code] = -1;
      }
      for (const dis of inputData["matrixConfig"]["DC"]["distanceBilling"][
        "matrix"
      ]) {
        if (
          dis["typeOfCustomer"] in distanceDict &&
          dis["typeOfVehicle"] === thisVehicle
        ) {
          if (dis["value"] <= 0) {
            // throw "vehicle does not go to customer";
          } else {
            distanceDict[dis["typeOfCustomer"]] = dis["value"];
          }
        }
      }

      let furthestLoc = null;
      let furthestDistance = Number.NEGATIVE_INFINITY;

      for (let key in distanceDict) {
        if (distanceDict[key] > furthestDistance) {
          furthestDistance = distanceDict[key];
          furthestLoc = key;
        }
      }
      let mainFee = 0;
      for (let m of inputData["matrixConfig"]["VC"]["mainFee"]["matrix"]) {
        if (
          m["typeOfCustomer"] === furthestLoc &&
          m["typeOfVehicle"] === thisVehicle
        ) {
          mainFee = m["value"];
          break;
        }
      }
      console.log(mainFee);
      let numberOfAdditionalFee = Object.keys(distanceDict).length - 1;
      let additionalFee = 0;
      if (numberOfAdditionalFee > 0) {
        for (let a of inputData["matrixConfig"]["VC"]["additionalFee"][
          "matrix"
        ]) {
          if (a["typeOfVehicle"] === thisVehicle) {
            if (a["value"] <= 0) {
              //standard additional fee == 150.000
              additionalFee = numberOfAdditionalFee * 150000;
              // throw "vehicle does not go to additional locations";
            } else {
              additionalFee = numberOfAdditionalFee * a["value"];
            }
            break;
          }
        }
      }
      route.main_cost = mainFee;
      route.additional_cost = additionalFee;
      route.total_cost = mainFee + additionalFee;
    });
  });

  let totalTotalCost = 0;
  outputDict.solutions.forEach((solution) => {
    solution.routes.forEach((route) => {
      totalTotalCost += route.total_cost;
    });
  });

  console.log(totalTotalCost);
  const jsonData = JSON.stringify(outputDict);
  fs.writeFile("newOutputdata.json", jsonData, "utf8")
    .then(() => {
      console.log("JSON file has been created.");
    })
    .catch((err) => {
      console.error("An error occurred:", err);
    });
});
