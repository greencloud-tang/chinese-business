//This latest version contains the table, the map and the word clouds.
//A toggle button is added to toggle between the map and the word clouds.

//Global variables:
let map;
let markers;
let markerMap = new Map(); // Store markers using data ID as key
let tabulator;
let tableData = [];
let filters = [];

//define the colors for the map markers.
const sectorColors = {
    "Accommodation and Food Services": "blue",
    "Administrative and Support Services": "green",
    "Construction": "sienna",
    "Education Services": "darkgreen",
    "Finance and Insurance": "red",
    "Government": "saddlebrown",
    "Health Care and Social Assistance": "slategray",
    "Information": "orange",
    "Manufacturing": "purple",
    "Mining": "charcoal",
    "Other Services (except Public Administration)": "brown",
    "Professional": "darkblue",
    "Retail Trade": "maroon",
    "Transportation": "cyan",
    "Wholesale Trade": "magenta",
    "Unclassified Establishments": "teal"
};

//----------------------
// Initialize application
function initializeApp() {
// Load CSV data
    fetch('ChinaBusinessDirectory.csv')
    .then(response => response.text())
    .then(csvText => {
        // Parse CSV using Papa Parse
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                tableData = results.data;
                generateRowIds(tableData); // Generate IDs for the loaded data
                console.log("Row ID:", tableData[0].id, " - Row:", tableData[0]);
                
                //add funtion to initiate the table;
                initTable();
        
                 
                //add function to initiate the map;
                 createOrUpdateMap(tableData);
            }
        });
    })
    .catch(error => console.error('Error loading CSV:', error));
}
//--------------------

//-------------------
//table innitialization: 
        function initTable() {
            const listFilterFields = ["Continent", "Country", "Sector", "Sub-Category"];
            const hiddenFields = ["Latitude", "Longitude","Name-chi","Name-eng","Type-chi","Type-eng","Town-chi","Town-eng","Province-chi","Province-eng","id"];
        
            if (!document.getElementById('businessTable')) {
                console.error("Table element not found");
                return;
            }
        
            const columns = Object.keys(tableData[0]).map(field => {
                let columnDefinition = {
                    title: field,
                    field: field,
                    headerFilterPlaceholder: "Search..."
                };
        
                if (listFilterFields.includes(field)) {
                    columnDefinition.headerFilter = "list";
                    columnDefinition.headerFilterParams = {
                        values: getUniqueValues(tableData, field),
                    };
                    columnDefinition.headerFilterPlaceholder = "Select";
                } else {
                    columnDefinition.headerFilter = "input";
                }
        
                if (hiddenFields.includes(field)) {
                    columnDefinition.visible = false;
                }
        
                return columnDefinition;
            });
        
            const businessTable = new Tabulator("#businessTable", {
                data: tableData, // Use the global tableData variable here
                headerFilterLive: true,
                layout: "fitColumns",
                pagination: "local",
                paginationSize: 20,
                paginationSizeSelector: [20, 50, 100],
                paginationButtonCount: 3,
                height: "100%",
                movableColumns: true,
                layoutColumnsOnNewData: true,
                columns: columns
            });

        //event listener when data is filtered.
        businessTable.on("dataFiltered", function(filters) {
            const field = filters.field;
            const filteredData = getAvailableOptions(tableData, field,filters).filteredData;
            console.log("filteredData", filteredData);
            FilteredRowCountDisplay(businessTable, filteredData, "filteredRowCount");
            updateListHeaderFilters(businessTable, businessTable.getData(), filters);
            
        //updateMapMarkers(rows.map(r => r.getData()));
        createOrUpdateMap(filteredData);

        //update word cloud
        updateWordCloudFromColumn(filteredData, "Type-chi", "wordCloudCanvas1");
        updateWordCloudFromColumn(filteredData, "Sector", "wordCloudCanvas2");
        });
        
        //event listener when data is loaded.
        businessTable.on("dataLoaded", function(data){
            updateListHeaderFilters(businessTable, businessTable.getData(), filters);

        //create word cloud
        updateWordCloudFromColumn(businessTable.getData(), "Type-chi", "wordCloudCanvas1");
        updateWordCloudFromColumn(businessTable.getData(), "Sector", "wordCloudCanvas2");
        });

        //event listener for the global search box.
        tableGlobalSearch(businessTable, "tableSearch", 300);

        //event listener for the clear all button.
        setupClearButton(businessTable, "tableSearch", "clearAll");

        //event listener for the toggle button for word clouds or map.
        toggleButton();
    }
//------------------------

// function to get unique values from filtered data
const getUniqueValues = (data, field) => _.uniq(_.map(data, field)).sort();

//----------------------
// Function to get filtered data based on current filters - use explicit filter logic -functions called: getUniqueValues.
const getAvailableOptions = (originalData, field, filters) => {
    const filteredData = _.filter(originalData, row => {
        return _.every(filters, filter => {
            // Skip current field's filter
            if (typeof filter === 'object' && filter.field === field) return true;
            
            // Handle function-based filters (e.g., global search)
            if (typeof filter.field === 'function') {
                return filter.field(row);
            }
            
            // Handle header filter objects
            if (filter.type === 'like') { // Input filters use 'like' type
                const value = filter.value ? filter.value.toLowerCase() : '';
                const rowValue = row[filter.field] ? row[filter.field].toString().toLowerCase() : '';
                return rowValue.includes(value);
            } else { // Exact match for list filters
                return row[filter.field] === filter.value;
            }
        });
    });
    const uniqueValues = getUniqueValues(filteredData, field);
    console.log("filteredData from getAvailableOptions", filteredData);
    return {
        filteredData: filteredData,
        uniqueValues: uniqueValues
    };
};


//function to get list filter fields of the table dynamically
    function getListFilterFields(table) {
        const fields = [];
        table.getColumns().forEach(column => {
          if (column.getDefinition().headerFilter === "list") {
            fields.push(column.getField());
          }
        });
        return fields;
      }
   
//function to update the list header filters- functions called: getListFilterFields, getAvailableOptions.
      function updateListHeaderFilters(table, tableData, filters) {
        const fields = getListFilterFields(table);
        fields.forEach(field => {
          const column = table.getColumn(field);
          if (!column) {
            console.error(`Column '${field}' not found.`);
            return;
        }
        console.log(`Column '${field}' found. headerFilter:`, column.getDefinition().headerFilter);
        if (column.getDefinition().headerFilter !== "list") {
            console.error(`Column '${field}' is not a list filter.`);
            return;
        }
        const availableOptions = getAvailableOptions(tableData, field, filters).uniqueValues;
          
          // Check if the column exists and if it's a list filter
          if (column && column.getDefinition().headerFilter === "list") {
            column.getDefinition().headerFilterParams = {
              values: availableOptions,
              search: true
            }
          }
            // Preserve current selection if valid
        const currentValue = column.getHeaderFilterValue();
        if (currentValue && availableOptions.includes(currentValue)) { 
            column.setHeaderFilterValue(currentValue);
        } else {
            column.setHeaderFilterValue("");
        }
        });
        }

//event listener function for the global search box. 
        function tableGlobalSearch(table, searchInputId, delay = 300) {
            const searchInput = document.getElementById(searchInputId);
            let searchTimeout;
          
            if (!searchInput) {
              console.error(`Search input with ID '${searchInputId}' not found.`);
              return;
            }
          
            searchInput.addEventListener("input", function(e) {
              console.log("searchInput triggered");
              clearTimeout(searchTimeout);
              searchTimeout = setTimeout(() => {
                const value = e.target.value;
                table.setFilter(function(data) {
                  return Object.values(data).some(val =>
                    val && val.toString().toLowerCase().includes(value.toLowerCase())
                  );
                });
              }, delay);
            });
          }
          
// event listener for the clear all button.
        function setupClearButton(table, searchInputId, clearButtonId) {
            const clearButton = document.getElementById(clearButtonId);
            const searchInput = document.getElementById(searchInputId);
          
            if (!clearButton) {
              console.error(`Clear button with ID '${clearButtonId}' not found.`);
              return;
            }
          
            if (!searchInput) {
              console.error(`Search input with ID '${searchInputId}' not found.`);
              return;
            }
          
            clearButton.addEventListener("click", function() {
              searchInput.value = "";
              table.clearFilter(true);
            });
          }

          
//function to display number of filtered rows - to add to dataFiltered event listener.
    function FilteredRowCountDisplay(table, rows, displayElementId) {
        const rowCountElement = document.getElementById("rowCount");
        const filteredRowCountDiv = document.getElementById(displayElementId);
  
        if (rowCountElement && filteredRowCountDiv) {
        rowCountElement.textContent = rows.length;
        }
    }

//function to generate row ids for the map.
    function generateRowIds(data) {
        let idCounter = 0;
        data.forEach(row => {
        row.id = idCounter++;
    });
    }

//----------------------------
  //A shared function to create or update the map - to be called by dataFiltered and dataLoaded event listeners.
  function createOrUpdateMap(data) {
    if (!data || data.length === 0) {
        console.error("No data to update map");
        clearMap();
        return;
    }

    if (!map) { // Initialize map only once
        map = L.map('map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        markers = L.markerClusterGroup();
        map.addLayer(markers);
    }

    let latLngBounds = L.latLngBounds();

    // 1. Update/Add Markers
    data.forEach(row => {
        if (row.Latitude && row.Longitude) {
            const lat = parseFloat(row.Latitude);
            const lng = parseFloat(row.Longitude);

            if (!isNaN(lat) && !isNaN(lng)) {
                const sector = row.Sector;
                const color = sectorColors[sector] || "gray";
                const markerId = row.id; // Assuming each row has a unique 'id'

                if (markerMap.has(markerId)) {
                    // Update existing marker
                    const marker = markerMap.get(markerId);
                    marker.setLatLng([lat, lng]);
                    marker.setPopupContent(`
                    <b>${row["Business Name Chinese"]} ${row["Business Name English"]}</b><br>
                    Category: ${row["Sub-Category"]}<br>
                    Location (Chinese): ${row["Location Chinese"]}<br>
                    Location (English): ${row["Location English"]}<br>
                    Country: ${row.Country}<br>
                    `);
                    marker.setStyle({ fillColor: color, color: color });
                } else {
                    // Create new marker
                    const marker = L.circleMarker([lat, lng], {
                        radius: 8,
                        fillColor: color,
                        color: color,
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });

                    let popupContent = `
                    <b>${row["Business Name Chinese"]} ${row["Business Name English"]}</b><br>
                    Category: ${row["Sub-Category"]}<br>
                    Location (Chinese): ${row["Location Chinese"]}<br>
                    Location (English): ${row["Location English"]}<br>
                    Country: ${row.Country}<br>
                    `;

                    marker.bindPopup(popupContent);
                    markers.addLayer(marker);
                    markerMap.set(markerId, marker);
                }

                latLngBounds.extend([lat, lng]);
            }
        }
    });

    // 2. Remove Old Markers
    const newDataIds = data.map(row => row.id);
    markerMap.forEach((marker, markerId) => {
        if (!newDataIds.includes(markerId)) {
            markers.removeLayer(marker);
            markerMap.delete(markerId);
        }
    });

    if (latLngBounds.isValid()) {
        map.fitBounds(latLngBounds);
    } else {
        map.setView([0, 0], 2);
    }
}
//-----------------------------


//function to clear the map.
    function clearMap() {
        if (markers) {
            markers.clearLayers();
        }
        markerMap.clear();
        if (map) {
            map.off();
            map.remove();
        map = undefined;
        }
    }

// ------------------
//function to create and update the word cloud for the column "Type-chi"
function updateWordCloudFromColumn(dataArray, columnName, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`Canvas element with ID "${canvasId}" not found.`);
      return;
    }
  
    function countCellFrequencies(cellValues) {
      const frequencyMap = {};
      cellValues.forEach(value => {
        frequencyMap[value] = (frequencyMap[value] || 0) + 1;
      });
      console.log("Frequency Map:", frequencyMap)
      return frequencyMap;
    }
  
    function formatWordCloudData(frequencyMap) {
      return Object.entries(frequencyMap);
    }
  
    // Use the dataArray directly
    const columnData = dataArray.map(row => row[columnName]);
    console.log("Extracted Column Data:", columnData)
  
    // Count the frequencies of each value in the specified column
    const frequencies = countCellFrequencies(columnData);
    console.log("Processing Value:", frequencies)
  
    // Format the data for wordcloud2.js. Added Scaling. 
    function formatWordCloudData(frequencyMap) {
        return Object.entries(frequencyMap).map(([word, count]) => {
          const normalizedCount = Math.log(count + 1); // Adding 1 to avoid log(0)
          const scaledWeight = normalizedCount * 3; // Adjust the multiplier as needed
          return [word, scaledWeight];
        });
      }

  // Format the data for wordcloud2.js
  const wordCloudData = formatWordCloudData(frequencies); 

 // Calculate a base font size and adjust based on the number of words
 const baseFontSize = 20; // Or any other base size you find suitable
 const numUniqueWords = Object.keys(frequencies).length;
 // Adjust the scaling factor to make it more responsive to small word counts
 let fontSizeFactor = 300;
 if (numUniqueWords < 5) {
     fontSizeFactor = 1000; // Greatly increase scaling for very few words
 } else if (numUniqueWords < 10) {
     fontSizeFactor = 600;
 }
 fontSizeFactor = Math.max(1, fontSizeFactor / (numUniqueWords + 5));

  // Dynamically calculate gridSize based on canvas width
  const canvasWidth = canvas.offsetWidth*0.9;
  const calculatedGridSize = Math.max(8, Math.round(canvasWidth / 80)); // Example: Adjust divisor for desired scaling

 const options = {
     list: wordCloudData,
     fontFamily: 'sans-serif, SimHei, STHeiti, MingLiU, PMingLiU',
     maxWords: 100,
     // Use the dynamic font size here
     fontSize: (word, weight) => baseFontSize + weight * fontSizeFactor,
     gridSize: calculatedGridSize, // Use the calculated gridSize,
     weightFactor: 1, // Use the calculated weightFactor,
     color: 'random-dark',
     backgroundColor: '#fff',
     rotateRatio: 0.5,
     rotationSteps: 2,
     drawOutOfBound: false,
 };
    // Clear the canvas before drawing
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    WordCloud(canvas, options);
}

//The toggle button to show the word cloud or the map.
function toggleButton() {
    const toggleButtonElement = document.getElementById('toggleButton');
    const wordCloudBlock = document.getElementById('wordCloudBlock');
    const mapBlock = document.getElementById('map'); // Get the map div
    let isCloudShowing = true; // Keep track of the current state

    const toggleDisplay = () => {
      if (isCloudShowing) {
        toggleButtonElement.textContent = 'Return to Map';

        // Show the word cloud block
        wordCloudBlock.style.display = 'flex';
        wordCloudBlock.classList.remove('hidden');
        wordCloudBlock.classList.add('visible');

        // Hide the map block
        mapBlock.classList.remove('visible');
        mapBlock.classList.add('hidden');

        // yourCloudFunction();
      } else {
        toggleButtonElement.textContent = 'Show Business Word Clouds';

        // Hide the word cloud block
        wordCloudBlock.style.display = 'none';
        wordCloudBlock.classList.remove('visible');
        wordCloudBlock.classList.add('hidden');

        // Show the map block
        mapBlock.classList.remove('hidden');
        mapBlock.classList.add('visible');
      }
      isCloudShowing = !isCloudShowing; // Toggle the state
    };

    toggleButtonElement.addEventListener('click', toggleDisplay);
  }

//-------------------------
// Start the application
    initializeApp()