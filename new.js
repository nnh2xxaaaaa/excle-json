import inputData from "./newInputData.json" assert { type: "json" };
import fs from "fs/promises";
import ExcelJS from "exceljs";

const wb = new ExcelJS.Workbook();
// add file excel

const fileName = "Actual_test_206.xlsx";

wb.xlsx.readFile(fileName).then(() => {
    //select sheet  file in excel
    const ws = wb.getWorksheet(3);
    //deliverNo Column
    const filterDeliverNo = ws.getColumn(3).values;
    //select Coloumn
    const filter_shipto_party_number = ws.getColumn(5).values;
    //select Coloumn
    const filter_Trucking_Number = ws.getColumn(7).values;
    //select Colomun
    const filter_truck_capacity_in_tons = ws.getColumn(9).values;
    //select Coloumn Transporter
    const filter_transporter = ws.getColumn(10).values;

    function convertString(str) {
        // Split the string into individual words
        const words = str.split(" ");

        // Convert each word to lowercase and capitalize the first letter
        const convertedWords = words.map(function (word) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        });

        let convertedString;
        if (convertedWords.join(" ") === "Thai Ha") {
            convertedString = convertedWords.join(" ") + " YMNorth-";
        } else {
            // Join the converted words back into a single string
            convertedString = convertedWords.join(" ") + "_YMNorth-";
        }

        return convertedString;
    }

    const truckingNumberToVehicle = {}
    for (let i = 2; i < filter_Trucking_Number.length; i++) {
        if (!(filter_Trucking_Number[i] in truckingNumberToVehicle)) {
            let thisTypeOfVehicle = convertString(filter_transporter[i]) +
                filter_truck_capacity_in_tons[i] + "T"
            for (let veh of inputData['vehicles']) {
                if (veh['vType']['typeOfVehicleByVendor'] === thisTypeOfVehicle) {
                    truckingNumberToVehicle[filter_Trucking_Number[i]] = veh;
                    break
                }
            }
        }
    }
    const orderCodeToRequest = {}
    for (let i = 2; i < filterDeliverNo.length; i++) {
        if (!(filterDeliverNo[i] in orderCodeToRequest)) {
            let thisOrderCode = filterDeliverNo[i].toString();
            for (let req of inputData['requests']) {
                if (req['orderCode'] === thisOrderCode) {
                    orderCodeToRequest[thisOrderCode] = req;
                    break;
                }
            }
        }
    }

    const routes = []
    for (let i = 2; i < filter_Trucking_Number.length; i++) {
        let r = {
            'vehicle': truckingNumberToVehicle[filter_Trucking_Number[i]],
            'requests': [filterDeliverNo[i]],
            'locationCode': [filter_shipto_party_number[i]],
        }
        let last_index = routes.length - 1;

        if (filter_Trucking_Number[i - 1] === filter_Trucking_Number[i]) {
            routes[last_index]['requests'].push(filterDeliverNo[i])
            routes[last_index]['requests'] = Array.from(new Set(routes[last_index]['requests']));
            routes[last_index]['locationCode'].push(filter_shipto_party_number[i]);
            routes[last_index]['locationCode'] = Array.from(new Set(routes[last_index]['locationCode']));
        } else {
            routes.push(r)
        }
    }
    const writeExcel = (data) => {
        const jsonData = JSON.stringify(data);

        fs.writeFile("st_206.json", jsonData, "utf8")
            .then(() => {
                console.log("JSON file has been created.");
            })
            .catch((err) => {
                console.error("An error occurred:", err);
            });
    }


    //loop through routes to call api
    const fetchApi = () => {
        let failCount = 0;
        let additionalCar = 0;
        let outputRoute = [];
        const promises = []
        for (let i = 0; i < routes.length; i++) {
            let currentRoute = routes[i];
            let items = []
            currentRoute['requests'].forEach(req => {
                let currentRequest = orderCodeToRequest[req];
                currentRequest['items'].forEach(item => {
                    let itemFormat = {
                        'item_code': item.itemCode,
                        'quantity': item.quantity,
                        'weight': item.weight / item.quantity,
                        'cbm': item.cbm / item.quantity,
                        'size': {
                            'length': item.size.length,
                            'width': item.size.width,
                            'height': item.size.height,
                        },
                        'i_type': {
                            'type_of_item_by_vehicle': item.iType.typeOfItemByVehicle,
                            'type_of_item_by_axis_lock': item.iType.typeOfItemByAxisLock,
                            'type_of_item_by_stack_rule': item.iType.typeOfItemByStackRule,
                        }
                    }
                    items.push(itemFormat);
                })
            })
            let data = {
                'items': items,
                'size': {
                    'length': currentRoute['vehicle']['size']['length'],
                    'width': currentRoute['vehicle']['size']['width'],
                    'height': currentRoute['vehicle']['size']['height'],
                }
            }

            const url = 'http://localhost:7001/depot';
            const promise =
                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                })
                    .then(response => response.json())
                    .then(result => {
                        if (result.length == 0) {
                            console.log("couldn't process route");
                            failCount += 1;
                        }
                        for (let t = 0; t < result.length; t++) {
                            if (t != 0) {
                                additionalCar += 1;
                                result[t]['total_cost'] = 'FAIL'
                            }
                            result[t]['vehicle_code'] = currentRoute['vehicle']['vehicleCode'];

                            result[t]['elements'][0]['location_code'] = '9511';
                            result[t]['elements'][0]['location_type'] = 'DEPOT'
                            let copy = JSON.parse(JSON.stringify(result[t]['elements'][0]));
                            copy['location_type'] = 'CUSTOMER'
                            result[t]['elements'].push(copy);

                        }
                        outputRoute = outputRoute.concat(result)

                    })
                    .catch(error => {
                        console.error('Error:', error);
                    });
            promises.push(promise)
        }
        Promise.all(promises).then(() => {
            console.log("fail: " + failCount.toString());
            console.log("vehicle to be added: " + additionalCar.toString())
            writeExcel({ 'solutions': [{ 'routes': outputRoute }] });
        })
        // writeExcel(outputRoute);
    }
    fetchApi();

    const typeOfVehicle = []
    const test = [];
    for (let i = 1; i < filter_shipto_party_number.length; i++) {
        if (i >= 2 && filter_Trucking_Number[i] != filter_Trucking_Number[i - 1]) {
            test.push({
                trucking_number: filter_Trucking_Number[i],
                shipto_party_number: [{ location_code: filter_shipto_party_number[i] }],
                txt: [{ location_code: typeOfVehicle[i] }],
            });
        } else if (
            i >= 2 &&
            filter_shipto_party_number[i] != filter_shipto_party_number[i - 1] &&
            filter_Trucking_Number[i] == filter_Trucking_Number[i - 1]
        ) {
            test[test.length - 1].shipto_party_number.push({
                location_code: filter_shipto_party_number[i],
                txt: [{ location_code: typeOfVehicle[i] }],
            });
        }
    }
    // console.log(test);

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

});
