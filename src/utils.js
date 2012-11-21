kg.utils = {
    visualLength: function (string) {
        var elem = document.getElementById('testDataLength');
        if (!elem) {
            elem = document.createElement('SPAN');
            elem.id = "testDataLength";
            elem.style.visibility = "hidden";
            document.body.appendChild(elem);
        }
        elem.innerHTML = string;
        return elem.offsetWidth;
    },
    forEach: function (arr, action) {
        var len = arr.length,
            i = 0;
        for (; i < len; i++) {
            if (arr[i] !== undefined) {
                action(arr[i], i);
            }
        }
    },

    sortByIndex: function (array, clone) {
        return (clone ? array.slice() : array).sort(function (a, b) {
            if (a.index === undefined || b.index === undefined) {
                return 0;
            }
            return a.index - b.index;
        });
    },

    forIn: function (obj, action) {
        var prop;

        for (prop in obj) {
            if(obj.hasOwnProperty(prop)){
                action(obj[prop], prop);
            }
        }
    },
        
    endsWith: function (str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    },

    printf: function (str, data) {
        var args = arguments;
        return str.replace(/{(\d+)}/g, function(match, number) {
            number = parseInt(number,10); 
            return args[number+1] !== undefined
                ? args[number+1]
                : match
            ;
        });
    },
    
    StringBuilder: function () {
        var strArr = [];
        
        this.append = function (str) {
            strArr.push(kg.utils.printf.apply(this, arguments));
        };

        this.toString = function () {
            var separator = arguments[0];
            if (separator !== null && separator !== undefined) {
                return strArr.join(separator);
            } else {
                return strArr.join("");
            }
        };
    },
    
    getElementsByClassName: function(cl) {
        var retnode = [];
        var myclass = new RegExp('\\b'+cl+'\\b');
        var elem = document.getElementsByTagName('*');
        for (var i = 0; i < elem.length; i++) {
            var classes = elem[i].className;
            if (myclass.test(classes)) retnode.push(elem[i]);
        }
        return retnode;
    },
    
    unwrapPropertyPath: function(path, entity){
        var propPath = path.split('.');
        var tempProp = entity[propPath[0]];

        for (var j = 1; j < propPath.length; j++){
            tempProp = ko.utils.unwrapObservable(tempProp)[propPath[j]];
        }
        return tempProp;
    },
    
    newId: (function () {
        var seedId = new Date().getTime();

        return function () {
            return seedId += 1;
        };
    })(),
    
    // we copy KO's ie detection here bc it isn't exported in the min versions of KO
    // Detect IE versions for bug workarounds (uses IE conditionals, not UA string, for robustness) 
    ieVersion: (function () {
        var version = 3, div = document.createElement('div'), iElems = div.getElementsByTagName('i');

        // Keep constructing conditional HTML blocks until we hit one that resolves to an empty fragment
        while (
            div.innerHTML = '<!--[if gt IE ' + (++version) + ']><i></i><![endif]-->',
            iElems[0]
        );
        return version > 4 ? version : undefined;
    })(),
    
    makeTemplate: function (templId, templText) {
        var template = document.createElement('script');
        $(template).attr('type', 'text/html');
        $(template).attr('id', templId);
        $(template).html(templText);
        return template;
    }
};

$.extend(kg.utils, {
    isIe6: (function(){ 
        return kg.utils.ieVersion === 6}
    )(),
    isIe7: (function(){ 
        return kg.utils.ieVersion === 7}
    )(),
    isIe: (function () { 
        return kg.utils.ieVersion !== undefined; 
    })()
}); 