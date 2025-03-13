//in this script, all filters, the search box and the clear all button are working dynamically. 
// Load CSV data
fetch('canada_business.csv')
    .then(response => response.text())
    .then(csvText => {
        // Parse CSV using Papa Parse
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                const tableData = results.data;

                // Create mappings using Lodash
                const mappings = {
                    continentToCountries: _.groupBy(tableData, 'Continent'),
                    countryToContinent: _.keyBy(tableData, 'Country'),
                    sectorToData: _.groupBy(tableData, 'Sector'),
                    subCategoryToData: _.groupBy(tableData, 'Sub-Category')
                };

                // Helper function to get unique values from filtered data
               const getUniqueValues = (data, field) => _.uniq(_.map(data, field)).sort();

               // Helper function to get available options based on current filters - use explicit filter logic
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
                return getUniqueValues(filteredData, field);
            };

                console.log("Tabulator initialization started");
                const businessTable = new Tabulator("#businessTable", {
                    data: tableData,
                    headerFilterLive: true,
                    layout: "fitColumns",
                    pagination: "local",
                    paginationSize: 20,
                    paginationSizeSelector: [20, 50, 100],
                    paginationButtonCount: 3,
                    height: "100%",
                    movableColumns: true,
                    layoutColumnsOnNewData: true,
                    columns: [
                        { 
                            title: "Continent", 
                            field: "Continent", 
                            headerFilter: "list", 
                            headerFilterParams: { values: getUniqueValues(tableData, 'Continent') }
                        },
                        { 
                            title: "Country", 
                            field: "Country", 
                            headerFilter: "list", 
                            headerFilterParams: { values: getUniqueValues(tableData, 'Country') }
                        },
                        { 
                            title: "Location (Chinese)", 
                            field: "Location Chinese",
                            headerFilter: "input",
                            headerFilterPlaceholder: "Search..."
                        },
                        { 
                            title: "Location (English)", 
                            field: "Location in English",
                            headerFilter: "input",
                            headerFilterPlaceholder: "Search..."
                        },
                        { 
                            title: "Current Location", 
                            field: "Current Location",
                            headerFilter: "input",
                            headerFilterPlaceholder: "Search..."
                        },
                        { 
                            title: "Latitude", 
                            field: "Latitude",
                            visible: false
                        },
                        { 
                            title: "Longitude", 
                            field: "Longitude",
                            visible: false
                        },
                        { 
                            title: "Business Name (Chinese)", 
                            field: "Business Name Chinese",
                            headerFilter: "input",
                            headerFilterPlaceholder: "Search..."
                        },
                        { 
                            title: "Business Name (English)", 
                            field: "Business Name English",
                            headerFilter: "input",
                            headerFilterPlaceholder: "Search..."
                        },
                        { 
                            title: "Sector", 
                            field: "Sector", 
                            headerFilter: "list", 
                            headerFilterParams: { values: getUniqueValues(tableData, 'Sector') }
                        },
                        { 
                            title: "Sub-Category", 
                            field: "Sub-Category", 
                            headerFilter: "list", 
                            headerFilterParams: { values: getUniqueValues(tableData, 'Sub-Category') }
                        }
                    ]
                });

                // Add custom styling to header
                businessTable.on("tableBuilt", () => {
                    const headerElements = document.getElementsByClassName("tabulator-header");
                    for (let element of headerElements) {
                        element.style.backgroundColor = "#f8f9fa";
                        element.style.fontWeight = "bold";
                    }
                });

                // Add text wrapping CSS
                const style = document.createElement('style');
                style.textContent = '.tabulator .tabulator-tableholder .tabulator-table .tabulator-cell { white-space: normal; }';
                document.head.appendChild(style);

                // Add search functionality
                const searchInput = document.getElementById("tableSearch");
                let searchTimeout;

                searchInput.addEventListener("input", function(e) {
                    console.log("searchInput triggered");
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        const value = e.target.value;
                        businessTable.setFilter(function(data) {
                            return Object.values(data).some(val => 
                                val && val.toString().toLowerCase().includes(value.toLowerCase())
                            );
                        });
                    }, 300);
                });

                // Clear all button
                const clearButton = document.getElementById("clearAll");
                clearButton.addEventListener("click", function() {
                    searchInput.value = "";
                    businessTable.clearFilter(true); 
                });

//When data is filtered, update the dropdown options of "list" filters.
                businessTable.on("dataFiltered", function(filters) {
                    console.log("dataFiltered triggered, filters:", filters);
                    console.log("--- FILTER DEBUG ---");
  
                    // 1. Log active filters
                    console.log("Active Filters:", filters);
                    
                    // 2. Compare Tabulator vs manual filtering
                    setTimeout(() => {
                      const tabulatorFiltered = businessTable.getData("filtered");
                      const manualFiltered = businessTable.getData("all").filter(row => {
                        return filters.every(filter => {
                          // Handle function-based filters (global search)
                          if (typeof filter.field === 'function') {
                            return filter.field(row); // Execute the function
                        }
                          
                          // Handle input ("like") filters
                          if (filter.type === 'like') {
                            const rowValue = String(row[filter.field] || '').toLowerCase();
                            const filterValue = String(filter.value || '').toLowerCase();
                            return rowValue.includes(filterValue);
                          }
                          
                          // Handle list ("=") filters
                          return row[filter.field] === filter.value;
                        });
                      });
                      
                      console.log("Tabulator says filtered:", tabulatorFiltered.length);
                      console.log("Manual filtered:", manualFiltered.length);
                      console.log("DOM visible rows:", businessTable.getRows(true).length);
                    }, 100);
                  
                    // Update all filters with available options based on current selections
                    ['Continent', 'Country', 'Sector', 'Sub-Category'].forEach(field => {
                        const column = businessTable.getColumn(field);
                        const availableOptions = getAvailableOptions(tableData, field, filters);
                
                        column.getDefinition().headerFilterParams = {
                            values: availableOptions,
                            search: true
                        };
                
                        // Preserve current selection if valid
                        const currentValue = column.getHeaderFilterValue();
                        if (currentValue && availableOptions.includes(currentValue)) { 
                            column.setHeaderFilterValue(currentValue);
                        } else {
                            column.setHeaderFilterValue("");
                        }
                    });
                
                    console.log("Filter updates complete");
                }); 
            },
            error: function(error) {
                console.error('Error parsing CSV:', error);
            }
        });
    })
    .catch(error => console.error('Error loading CSV:', error));
//current bugs: 
//1. the clear all button does not work.- fixed.
//2. when the "search" filters are used, the dropdown options of "list" filters are not updated. - fixed.