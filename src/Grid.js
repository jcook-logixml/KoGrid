﻿/// <reference path="../lib/jquery-1.7.js" />
/// <reference path="../lib/knockout-2.0.0.debug.js" />
//
// Available template options for template generated from templates:
//  row:
//      rowContainerTemplate
//      baseCellTemplate
//      selectionCellTemplate
//      rowIndexCellTemplate
//      
//  header:
//      headerGroupContainerContainerTemplate
//      headerGroupContainerTemplate
//      headerGroupFooterTemplate
//      headerSelectionTemplate
//      headerFilterTemplate
//      headerColumnTemplate

kg.KoGrid = function (options, gridWidth) {
    var defaults = {
        rowHeight: 30,
        columnWidth: 100,
        headerRowHeight: 30,
        footerRowHeight: 55,
        filterRowHeight: 30,

        rowTemplate: 'kgRowTemplate',
        headerTemplate: 'kgHeaderRowTemplate',
        headerCellTemplate: 'kgHeaderCellTemplate',
        footerTemplate: 'kgFooterTemplate',

        footerVisible: ko.observable(true),
        canSelectRows: true,
        autogenerateColumns: true,
        data: null, //ko.observableArray
        columnDefs: ko.observableArray([]),
        pageSizes: [250, 500, 1000], //page Sizes
        enablePaging: false,
        pageSize: ko.observable(250), //Size of Paging data
        totalServerItems: ko.observable(), //ko.observable of how many items are on the server (for paging)
        currentPage: ko.observable(1), //ko.observable of what page they are currently on
        selectedItems: ko.observableArray([]), //ko.observableArray
        selectedIndex: ko.observable(0), //observable of the index of the selectedItem in the data array
        displaySelectionCheckbox: true, //toggles whether row selection check boxes appear
        displayRowIndex: true, //shows the rowIndex cell at the far left of each row
        useExternalFiltering: false,
        useExternalSorting: false,
        filterInfo: ko.observable(), //observable that holds filter information (fields, and filtering strings)
        sortInfo: ko.observable(), //observable similar to filterInfo
        filterWildcard: "*",
        includeDestroyed: false, // flag to show _destroy=true items in grid
        selectWithCheckboxOnly: false,
        keepLastSelectedAround: false,
        isMultiSelect: true,
        lastClickedRow: ko.observable(),
        tabIndex: -1,
        disableTextSelection: false,
        enableColumnResize: true,
        allowFiltering: true,
        resizeOnAllData: false,
        plugins: []
    },

    self = this,
    filterIsOpen = ko.observable(false), //observable so that the header can subscribe and change height when opened
    filterManager, //kg.FilterManager
    sortManager, //kg.SortManager
    isSorting = false,
    prevScrollTop,
    prevScrollLeft,
    prevMinRowsToRender,
    maxCanvasHt = 0,
    h_updateTimeout;

    this.$root; //this is the root element that is passed in with the binding handler
    this.$topPanel;
    this.$headerContainer;
    this.$headerScroller;
    this.$headers;
    this.$viewport;
    this.$canvas;
    this.$footerPanel;
    this.width = ko.observable(gridWidth);
    this.selectionManager;
    this.selectedItemCount;

    //If column Defs are not observable, make them so. Will not update dynamically this way.
    if (options.columnDefs && !ko.isObservable(options.columnDefs)){
        var observableColumnDefs = ko.observableArray(options.columnDefs);
        options.columnDefs = observableColumnDefs;
    }
    this.config = $.extend(defaults, options);
    this.gridId = "kg" + kg.utils.newId();
    this.initPhase = 0;
    this.isMultiSelect = ko.observable(self.config.isMultiSelect);
    this.headerGroups = ko.observable();

    // Set new default footer height if not overridden, and multi select is disabled
    if (this.config.footerRowHeight === defaults.footerRowHeight
        && !this.config.canSelectRows) {
        defaults.footerRowHeight = 30;
        this.config.footerRowHeight = 30;
    }
    
    // set this during the constructor execution so that the
    // computed observables register correctly;
    this.data = self.config.data;

    filterManager = new kg.FilterManager(self.config);
    sortManager = new kg.SortManager({
        data: filterManager.filteredData,
        sortInfo: self.config.sortInfo,
        useExternalSorting: self.config.useExternalSorting
    });

    this.sortInfo = sortManager.sortInfo; //observable
    this.filterInfo = filterManager.filterInfo; //observable
    this.finalData = sortManager.sortedData; //observable Array
    this.canvasHeight = ko.observable(maxCanvasHt.toString() + 'px');

    this.maxRows = ko.computed(function () {
        var rows = self.finalData();
        maxCanvasHt = rows.length * self.config.rowHeight;
        self.canvasHeight(maxCanvasHt.toString() + 'px');
        return rows.length || 0;
    });

    this.maxCanvasHeight = function () {
        return maxCanvasHt || 0;
    };

    this.columns = new kg.ColumnCollection();

    //initialized in the init method
    this.rowManager;
    this.rows;
    this.headerRow;
    this.footer;

    this.elementDims = {
        scrollW: 0,
        scrollH: 0,
        cellHdiff: 0,
        cellWdiff: 0,
        rowWdiff: 0,
        rowHdiff: 0,
        rowIndexCellW: 25,
        rowSelectedCellW: 25,
        rootMaxW: 0,
        rootMaxH: 0,
        rootMinW: 0,
        rootMinH: 0
    };
    this.elementsNeedMeasuring = true;

    //#region Container Dimensions

    this.rootDim = ko.observable(new kg.Dimension({ outerHeight: 20000, outerWidth: 20000 }));

    this.headerDim = ko.computed(function () {
        var rootDim = self.rootDim(),
            filterOpen = filterIsOpen(),
            newDim = new kg.Dimension();

        newDim.outerHeight = self.config.headerRowHeight;
        newDim.outerWidth = rootDim.outerWidth;

        if (filterOpen) {
            newDim.outerHeight += self.config.filterRowHeight;
        }

        return newDim;
    });

    this.footerDim = ko.computed(function () {
        var rootDim = self.rootDim(),
            showFooter = self.config.footerVisible(),
            newDim = new kg.Dimension();

        newDim.outerHeight = self.config.footerRowHeight;
        newDim.outerWidth = rootDim.outerWidth;

        if (!showFooter) {
            newDim.outerHeight = 3;
        }

        return newDim;
    });

    this.viewportDim = ko.computed(function () {
        var rootDim = self.rootDim(),
            headerDim = self.headerDim(),
            footerDim = self.footerDim(),
            newDim = new kg.Dimension();

        newDim.outerHeight = rootDim.outerHeight - headerDim.outerHeight - footerDim.outerHeight;
        newDim.outerWidth = rootDim.outerWidth;
        newDim.innerHeight = newDim.outerHeight;
        newDim.innerWidth = newDim.outerWidth;

        return newDim;
    });

    this.getScrollerOffset = function (n) {
        return n -17;
    };

    this.totalRowWidth = ko.computed(function () {
        var totalWidth = 0,
            cols = self.columns(),
            numOfCols = cols.length,
            asterisksArray = [],
            percentArray = [],
            asteriskNum = 0;
            
        kg.utils.forEach(cols, function (col, i) {
            // get column width out of the observable
            var t = col.width();
            // check if it is a number
            if (isNaN(t)) {
                //get it again?
                t = col.width();
                // figure out if the width is defined or if we need to calculate it
                if (t == undefined) {
                    // set the width to the length of the header title +30 for sorting icons and padding
                    col.width((col.displayName.length * kg.domUtility.letterW) + 30); 
                } else if (t == "auto") { // set it for now until we have data and subscribe when it changes so we can set the width.
                    col.width(col.minWidth());
                    col.autoWidthSubscription = self.finalData.subscribe(function (newArr) {
                        if (newArr.length > 0) {
                            self.resizeOnData(col, true);
                        }
                    });
                } else if (t.indexOf("*") != -1) {
                    // if it is the last of the columns just configure it to use the remaining space
                    if (i + 1 == numOfCols && asteriskNum == 0) {
                        col.width(self.getScrollerOffset(self.width() - totalWidth));
                    } else { // otherwise we need to save it until the end to do the calulations on the remaining width.
                        asteriskNum += t.length;
                        asterisksArray.push(col);
                        return;
                    }
                } else if (kg.utils.endsWith(t, "%")){ // If the width is a percentage, save it until the very last.
                    percentArray.push(col);
                    return;
                } else { // we can't parse the width so lets throw an error.
                    throw "unable to parse column width, use percentage (\"10%\",\"20%\", etc...) or \"*\" to use remaining width of grid";
                }
            }
            // set the flag as the width is configured so the subscribers can be added
            col.widthIsConfigured = true;
            // add the caluclated or pre-defined width the total width
            totalWidth += col.width();
        });
        // check if we saved any asterisk columns for calculating later
        if (asterisksArray.length > 0){
            // get the remaining width
            var remainigWidth = self.width() - totalWidth;
            // calculate the weight of each asterisk rounded down
            var asteriskVal = Math.floor(remainigWidth / asteriskNum);
            // set the width of each column based on the number of stars
            kg.utils.forEach(asterisksArray, function (col, i) {
                var t = col.width().length;
                if (i+1 == asterisksArray.length) {
                    col.width(self.getScrollerOffset(asteriskVal * t));
                } else {
                    col.width(asteriskVal * t);
                }
                // set the flag as the width is configured so the subscribers can be added
                col.widthIsConfigured = true;
                totalWidth += col.width();
            });
        }
        // Now we check if we saved any percentage columns for calculating last
        if (percentArray.length > 0){
            // do the math
            kg.utils.forEach(percentArray, function (col, i) {
                var t = col.width();
                col.width(Math.floor(self.width() * (parseInt(t.slice(0, - 1)) / 100)));
                totalWidth += col.width();
                // set the flag as the width is configured so the subscribers can be added
                col.widthIsConfigured = true;
            });
        }
        return totalWidth;
    });

    this.minRowsToRender = ko.computed(function () {
        var viewportH = self.viewportDim().outerHeight || 1;

        if (filterIsOpen()) {
            return prevMinRowsToRender;
        };

        prevMinRowsToRender = Math.floor(viewportH / self.config.rowHeight);

        return prevMinRowsToRender;
    });


    this.headerScrollerDim = ko.computed(function () {
        var viewportH = self.viewportDim().outerHeight,
            filterOpen = filterIsOpen(), //register this observable
            maxHeight = self.maxCanvasHeight(),
            newDim = new kg.Dimension();

        newDim.autoFitHeight = true;
        newDim.outerWidth = self.totalRowWidth() + 17;
        return newDim;
    });

    //#endregion

    //#region Events
    this.toggleSelectAll;

    this.sortData = function (col, dir) {
        isSorting = true;

        kg.utils.forEach(self.columns(), function (column) {
            if (column.field !== col.field) {
                if (column.sortDirection() !== "") { column.sortDirection(""); }
            }
        });

        sortManager.sort(col, dir);

        isSorting = false;
    };

    //#endregion

    //keep selected item scrolled into view
    this.finalData.subscribe(function () {
        kg.utils.forEach(self.columns(), function (col) {
            col.longest = null;
        });
         if (self.config.selectedItems()) {
            var lastItemIndex = self.config.selectedItems().length - 1;
            if (lastItemIndex <= 0) {
                var item = self.config.selectedItems()[lastItemIndex];
                if (item) {
                   scrollIntoView(item);
                }
            }
        }
    });

    var scrollIntoView = function (entity) {
        var itemIndex,
            viewableRange = self.rowManager.viewableRange();
        if (entity) {
            itemIndex = ko.utils.arrayIndexOf(self.finalData(), entity);
        }
        if (itemIndex > -1) {
            //check and see if its already in view!
            if (itemIndex > viewableRange.topRow || itemIndex < viewableRange.bottomRow - 5) {

                //scroll it into view
                self.rowManager.viewableRange(new kg.Range(itemIndex, itemIndex + self.minRowsToRender()));

                if (self.$viewport) {
                    self.$viewport.scrollTop(itemIndex * self.config.rowHeight);
                }
            }
        };
    };
    this.resizeOnData = function (col, override) {
        if (col.longest) { // check for cache so we don't calculate again
            col.width(col.longest);
        } else {// we calculate the longest data.
            var road = override || self.config.resizeOnAllData;
            var longest = col.minWidth();
            var arr = road ? self.finalData() : self.rows();
            kg.utils.forEach(arr, function(data) {
                var i = kg.utils.visualLength(ko.utils.unwrapObservable(data[col.field]));
                if (i > longest) {
                    longest = i;
                }
            });
            longest += 10; //add 10 px for decent padding if resizing on data.
            col.longest = longest > col.maxWidth() ? col.maxWidth() : longest;
            col.width(longest);
        }
        if (col.autoWidthSubscription) { // check for a subsciption and delete it.
            col.autoWidthSubscription.dispose();
        }
    };
    this.refreshDomSizes = function () {
        var dim = new kg.Dimension(),
            oldDim = self.rootDim(),
            rootH = 0,
            rootW = 0,
            canvasH = 0;

        self.elementsNeedMeasuring = true;

        //calculate the POSSIBLE biggest viewport height
        rootH = self.maxCanvasHeight() + self.config.headerRowHeight + self.config.footerRowHeight;

        //see which viewport height will be allowed to be used
        rootH = Math.min(self.elementDims.rootMaxH, rootH);
        rootH = Math.max(self.elementDims.rootMinH, rootH);

        //now calc the canvas height of what is going to be used in rendering
        canvasH = rootH - self.config.headerRowHeight - self.config.footerRowHeight;

        //get the max row Width for rendering
        rootW = self.totalRowWidth() + self.elementDims.rowWdiff;

        //now see if we are going to have a vertical scroll bar present
        if (self.maxCanvasHeight() > canvasH) {

            //if we are, then add that width to the max width 
            rootW += self.elementDims.scrollW || 0;
        }

        //now see if we are constrained by any width dimensions
        dim.outerWidth = Math.min(self.elementDims.rootMaxW, rootW);
        dim.outerWidth = Math.max(self.elementDims.rootMinW, dim.outerWidth);

        dim.outerHeight = rootH;

        //finally don't fire the subscriptions if we aren't changing anything!
        if (dim.outerHeight !== oldDim.outerHeight || dim.outerWidth !== oldDim.outerWidth) {

            //if its not the same, then fire the subscriptions
            self.rootDim(dim);
        }
    };

    this.refreshDomSizesTrigger = ko.computed(function () {
        //register dependencies
        var data = self.data();

        if (h_updateTimeout) {
            if (window.setImmediate) {
                window.clearImmediate(h_updateTimeout);
            } else {
                window.clearTimeout(h_updateTimeout);
            }
        }

        if (self.initPhase > 0) {

            //don't shrink the grid if we sorting or filtering
            if (!filterIsOpen() && !isSorting) {

                self.refreshDomSizes();

                kg.cssBuilder.buildStyles(self);

                if (self.initPhase > 0 && self.$root) {
                    self.$root.show();
                }
            }
        }

    });

    this.buildColumnDefsFromData = function () {
        if (self.config.columnDefs().length > 0){
            return;
        }
        if (!self.data() || !self.data()[0]) {
            throw 'If auto-generating columns, "data" cannot be of null or undefined type!';
        }

        var item;
        item = self.data()[0];

        kg.utils.forIn(item, function (prop, propName) {
            if (propName === '__kg_selected__') {
                return;
            }

            self.config.columnDefs().push({
                field: propName
            });
        });

    };

    this.buildColumns = function () {
        var columnDefs = self.config.columnDefs(),
            cols = [];

        if (self.config.autogenerateColumns) { self.buildColumnDefsFromData(); }

	    var targetCol = 0;
        if (self.config.displayRowIndex) {
            if (!columnDefs[targetCol] || columnDefs[targetCol].field != 'rowIndex') {
                columnDefs.splice(targetCol, 0, { field: 'rowIndex', width: self.elementDims.rowIndexCellW });
            }
            targetCol ++;
        }
        
        if (self.config.displaySelectionCheckbox) {
            if (!columnDefs[targetCol] || columnDefs[targetCol].field != '__kg_selected__') {
                columnDefs.splice(targetCol, 0, { field: '__kg_selected__', width: self.elementDims.rowSelectedCellW });
            }
        }

        var createColumnSortClosure = function(col) {
            return function(dir) {
                if (dir) {
                    self.sortData(col, dir);
                }
            };
        };

        if (columnDefs.length > 0) {

            kg.utils.forEach(columnDefs, function (colDef, i) {
                var column = new kg.Column(colDef, i);
                column.sortDirection.subscribe(createColumnSortClosure(column));                
                column.filter.subscribe(filterManager.createFilterChangeCallback(column));
                cols.push(column);
            });

            self.columns(cols);
        }
    };

    this.init = function () {

        self.buildColumns();

        //now if we are using the default templates, then make the generated ones unique
        if (self.config.rowTemplate === 'kgRowTemplate') {
            self.config.rowTemplate = self.gridId + self.config.rowTemplate;
        }

        if (self.config.headerTemplate === 'kgHeaderRowTemplate') {
            self.config.headerTemplate = self.gridId + self.config.headerTemplate;
        }

        self.rowManager = new kg.RowManager(self);
        self.selectionManager = new kg.SelectionManager({
            isMultiSelect: self.config.isMultiSelect,
            data: self.finalData,
            selectedItem: self.config.selectedItem,
            selectedItems: self.config.selectedItems,
            selectedIndex: self.config.selectedIndex,
            lastClickedRow: self.config.lastClickedRow,
            isMulti: self.config.isMultiSelect
        }, self.rowManager);
        
        kg.utils.forEach(self.columns(), function(col) {
            if (col.widthIsConfigured){
                col.width.subscribe(function(){
                    self.rowManager.dataChanged = true;
                    self.rowManager.rowCache = []; //if data source changes, kill this!
                    self.rowManager.calcRenderedRange();
                });
            }
        });

        self.selectedItemCount = self.selectionManager.selectedItemCount;
        self.toggleSelectAll = self.selectionManager.toggleSelectAll;
        self.rows = self.rowManager.rows; // dependent observable

        kg.cssBuilder.buildStyles(self);
        kg.utils.forEach(self.config.plugins, function (p) {
            p.onGridInit(self);
        });
        self.initPhase = 1;
    };

    this.update = function () {
        //we have to update async, or else all the observables are registered as dependencies

        var updater = function () {

            self.refreshDomSizes();

            kg.cssBuilder.buildStyles(self);

            if (self.initPhase > 0 && self.$root) {
                self.$root.show();
            }
        };

        if (window.setImmediate) {
            h_updateTimeout = setImmediate(updater);
        } else {
            h_updateTimeout = setTimeout(updater, 0);
        }
        kg.utils.forEach(self.config.plugins, function(p) {
            p.onGridUpdate(self);
        });
    };

    this.showFilter_Click = function () {
        self.headerRow.filterVisible(!filterIsOpen());
        filterIsOpen(!filterIsOpen());
    };

    this.clearFilter_Click = function () {
        kg.utils.forEach(self.columns(), function (col, i) {
            col.filter(null);
        });
    };

    this.adjustScrollTop = function (scrollTop, force) {
        var rowIndex;

        if (prevScrollTop === scrollTop && !force) { return; }

        rowIndex = Math.floor(scrollTop / self.config.rowHeight);

        prevScrollTop = scrollTop;

        self.rowManager.viewableRange(new kg.Range(rowIndex, rowIndex + self.minRowsToRender()));
    };

    this.adjustScrollLeft = function (scrollLeft) {
        if (self.$headerContainer) {
            self.$headerContainer.scrollLeft(scrollLeft);
        }
    };

    //call init
    self.init();
};