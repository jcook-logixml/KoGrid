kg.templates.generateRowTemplate = function (options) {
    var $row,
        $b = $("<div></div>"),
        _f = kg.utils.printf,
        _t = kg.templateManager.getTemplateFromDom,
        cols = options.columns;

    $row = $(_t(options.rowContainerTemplate) || '<div data-bind="kgRow: $data, click: $data.toggleSelected, css: { \'kgSelected\': $data.selected }"></div>').appendTo($b);

    kg.utils.forEach(cols, function (col, i) {

        // check for the Selection Column
        if (col.field === '__kg_selected__') {
            $row.append(_f(_t(options.selectionCellTemplate) || 
                '<div class="kgSelectionCell" data-bind="kgCell: { value: \'{0}\' } ">' + 
                '  <input type="checkbox" data-bind="checked: $data.selected" />' +
                '</div>', col.field));
        }
            // check for RowIndex Column
        else if (col.field === 'rowIndex') {
            $row.append(_f(_t(options.rowIndexCellTemplate) || '<div class="kgRowIndexCell" data-bind="kgCell: { value: \'{0}\' } "></div>', col.field));
        }
            // check for a Column with a Cell Template
        else if (col.hasCellTemplate) {
            // first pull the template
            var tmpl = kg.templateManager.getTemplate(col.cellTemplate).innerHTML;

            // build the replacement text
            var replacer = "{ value: '" + col.field + "' }";

            // run any changes on the template for re-usable templates
            tmpl = tmpl.replace(/\$cellClass/g, col.cellClass || 'kgEmpty');
            tmpl = tmpl.replace(/\$cellValue/g, "$data." + col.field);
            tmpl = tmpl.replace(/\$cell/g, replacer);

            $row.append(tmpl);
        }
            // finally just use a basic template for the cell
        else {
            $row.append(_f(_t(options.baseCellTemplate) || '  <div class="{0}"  data-bind="kgCell: { value: \'{1}\' } "></div>', col.cellClass || 'kgEmpty', col.field));
        }
    });

    return $b.html();
};