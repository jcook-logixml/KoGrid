kg.templates.defaultGridInnerTemplate = function (options) {

    var $b = $("<div></div>"),
        _t = kg.templateManager.getTemplateFromDom,
        _f = kg.utils.printf;

    // var b = new kg.utils.StringBuilder();
    $b.append(_t(options.topPanelTemplate) || '<div class="kgTopPanel" data-bind="kgSize: $data.headerDim">' +
        '<div class="kgHeaderContainer" data-bind="kgSize: $data.headerDim">' +
            '<div class="kgHeaderScroller" data-bind="kgHeaderRow: $data, kgSize: $data.headerScrollerDim">' +
            '</div>' +
        '</div>' +
    '</div>');

    $b.append(_f(_t(options.viewPortTemplate) || '<div class="kgViewport {0}" data-bind="kgSize: $data.viewportDim">' +
        '<div class="kgCanvas" data-bind="kgRows: $data.rows, style: { height: $data.canvasHeight, width: $data.totalRowWidth }" style="position: relative"></div>' +
        '</div>' +
        '<div class="kgFooterPanel" data-bind="kgFooter: $data, kgSize: $data.footerDim">' +
    '</div>', options.disableTextSelection ? "kgNoSelect": ""));

    return $b.html();
};