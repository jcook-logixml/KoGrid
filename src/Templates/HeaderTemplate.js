kg.templates.generateHeaderTemplate = function (options) {
	var $row,
		$b = $("<div></div>"),
		_t = kg.templateManager.getTemplateFromDom,
		_f = kg.utils.printf,
        cols = options.columns;

    var hasHeaderGroups = false;
    var headerGroups = { };
    var leftMargin = 0;
    var prevHeaderGroup;
    kg.utils.forEach(cols, function (col, i) {
	    if (col.headerGroup) {
	        if (!headerGroups[col.headerGroup]) {
	            var newGroup = {
	                width: ko.computed(function () {
	                    var hgs = options.headerGroups();
	                    if (!hgs || !hgs[col.headerGroup]) return 0;
	                    var arr = hgs[col.headerGroup].columns;
	                    var width = 0;
	                    kg.utils.forEach(arr, function (column) {
	                        width += column.width();
	                    });
	                    return width - 1;
	                }),
	                columns: [],
	                margin: ko.observable(leftMargin),
	                rightHeaderGroup: "",
	                parent: headerGroups
	            };
	            headerGroups[col.headerGroup] = newGroup;
	            if (prevHeaderGroup) headerGroups[prevHeaderGroup].rightHeaderGroup = col.headerGroup;
	            prevHeaderGroup = col.headerGroup;
	            hasHeaderGroups = true;
	        }
	        headerGroups[col.headerGroup].columns.push(col);
	    } else {
	        if (prevHeaderGroup) headerGroups[prevHeaderGroup].rightHeaderGroup = col.headerGroup;
	        if ((options.displayRowIndex && options.displaySelectionCheckbox && i > 1) || 
	           (options.displayRowIndex && !options.displaySelectionCheckbox && i > 0) ||
	           (options.displaySelectionCheckbox && !options.displayRowIndex && i > 0)) {
	            if (!headerGroups[i]) {
	                headerGroups[i] = {
	                    width: ko.computed(function () {
	                        var hgs = options.headerGroups();
	                        if (!hgs || !hgs[col.headerGroup]) return 0;
	                        var arr = hgs[col.headerGroup].columns;
	                        var width = 0;
	                        kg.utils.forEach(arr, function (column) {
	                            width += column.width();
	                        });
	                        return width - 1;
	                    }),
	                    columns: [],
	                    margin: ko.observable(leftMargin),
	                    rightHeaderGroup: "",
	                    parent: headerGroups
	                };
	            }
	            if (!prevHeaderGroup) prevHeaderGroup = i;
	        }
	    }
	    leftMargin += col.width();
	});

    if (hasHeaderGroups) {
        options.headerGroups(headerGroups);
        var $hgcc = $(_f(_t(options.headerGroupContainerContainerTemplate) || '<div style="position: absolute; line-height: 30px; height: 30px; top: 0px; left:0px; right: 17px; "></div>')).appendTo($b);
        kg.utils.forIn(headerGroups, function (group) {
            if (group.columns.length > 0) {
                $hgcc.append(_f(_t(options.headerGroupContainerTemplate) || '<div class="kgHeaderGroupContainer" data-bind="style: { width: $parent.headerGroups()[\'{0}\'].width() + \'px\', left: $parent.headerGroups()[\'{0}\'].margin() + \'px\' }" style="position: absolute; text-align: center;">{0}</div>',group.columns[0].headerGroup ? group.columns[0].headerGroup : ""));
            }
        });
        $row = $(_t(options.headerGroupFooterTemplate) || '<div style="position: absolute; line-height: 30px; height 30px; top: 31px; "></div>').appendTo($b);
    } else {
    	$row = $("<div></div>").appendTo($b);
    }
    
    kg.utils.forEach(cols, function (col) {
        if (col.field === '__kg_selected__') {
            $row.append(_f(_t(options.headerSelectionTemplate) || '<div class="kgSelectionCell" data-bind="kgHeader: { value: \'{0}\' }, style: { width: $parent.columns()[{2}].width() + \'px\'}, css: { \'kgNoSort\': {1} }">' +
            	'  <input type="checkbox" data-bind="visible: $parent.isMultiSelect, checked: $parent.toggleSelectAll"/>' +
            	'</div>', col.field, !col.allowSort, col.index));
        } else if (col.field === 'rowIndex' &&  options.showFilter) {
            $row.append(_f(_t(options.headerFilterTemplate) || '<div data-bind="kgHeader: { value: \'{0}\' }, css: { \'kgNoSort\': {1} }, style: { width: $parent.columns()[{2}].width() + \'px\'},">' +
            	'	<div title="Toggle Filter" class="kgFilterBtn" data-bind="css:{\'closeBtn\' : $data.filterVisible() == true, \'openBtn\' : $data.filterVisible() == false }, click: $parent.showFilter_Click"></div>' +
            	'	<div title="Clear Filters" class="kgFilterBtn clearBtn" data-bind="visible: $data.filterVisible, click: $parent.clearFilter_Click"></div>' +
            	'</div>', col.field, !col.allowSort, col.index));
        } else {
            $row.append(_f(_t(options.headerColumnTemplate) || '<div style="height: 30px; border-right: {3}; " data-bind="kgHeader: { value: \'{0}\' }, style: { width: $parent.columns()[{1}].width() + \'px\'}, css: { \'kgNoSort\': {2} }"></div>', col.field, col.index, !col.allowSort, col.index === (cols.length - 1) ? '1px solid black': '0'));
        }
    });

    return hasHeaderGroups ? $b.html() : $row.html();
};
