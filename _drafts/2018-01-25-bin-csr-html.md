---
title: The BIN-CSR Sparse Matrix Format
layout: post
tags: [math, physics]
comments: false
math: false
jquery: true
---

<div class="bin-csr-input">
    <style type="text/css">

        form input {
            width: 2em;
            text-align: center;
            margin-bottom: 5px;
        }

        #bin-csr .array label {
            width: 5em;
            text-align: right;
            display: inline-block;
        }

        #bin-csr .contents {
            margin-left: 10px;
        }

    </style>

    <form id="matrix" role="form">
        <label>Input Matrix:</label>
        <br>
        <input type="number" id="m00" onchange="updateMatrix()" value="1">
        <input type="number" id="m01" onchange="updateMatrix()" value="8">
        <input type="number" id="m02" onchange="updateMatrix()">
        <input type="number" id="m03" onchange="updateMatrix()">
        <input type="number" id="m04" onchange="updateMatrix()">
        <input type="number" id="m05" onchange="updateMatrix()" value="9">
        <input type="number" id="m06" onchange="updateMatrix()">
        <br>
        <input type="number" id="m10" disabled>
        <input type="number" id="m11" onchange="updateMatrix()" value="2">
        <input type="number" id="m12" onchange="updateMatrix()">
        <input type="number" id="m13" onchange="updateMatrix()">
        <input type="number" id="m14" onchange="updateMatrix()">
        <input type="number" id="m15" onchange="updateMatrix()">
        <input type="number" id="m16" onchange="updateMatrix()" value="10">
        <br>
        <input type="number" id="m20" disabled>
        <input type="number" id="m21" disabled>
        <input type="number" id="m22" onchange="updateMatrix()" value="3">
        <input type="number" id="m23" onchange="updateMatrix()">
        <input type="number" id="m24" onchange="updateMatrix()">
        <input type="number" id="m25" onchange="updateMatrix()">
        <input type="number" id="m26" onchange="updateMatrix()">
        <br>
        <input type="number" id="m30" disabled>
        <input type="number" id="m31" disabled>
        <input type="number" id="m32" disabled>
        <input type="number" id="m33" onchange="updateMatrix()" value="4">
        <input type="number" id="m34" onchange="updateMatrix()">
        <input type="number" id="m35" onchange="updateMatrix()" value="11">
        <input type="number" id="m36" onchange="updateMatrix()">
        <br>
        <input type="number" id="m40" disabled>
        <input type="number" id="m41" disabled>
        <input type="number" id="m42" disabled>
        <input type="number" id="m43" disabled>
        <input type="number" id="m44" onchange="updateMatrix()" value="5">
        <input type="number" id="m45" onchange="updateMatrix()">
        <input type="number" id="m46" onchange="updateMatrix()">
        <br>
        <input type="number" id="m50" disabled>
        <input type="number" id="m51" disabled>
        <input type="number" id="m52" disabled>
        <input type="number" id="m53" disabled>
        <input type="number" id="m54" disabled>
        <input type="number" id="m55" onchange="updateMatrix()" value="6">
        <input type="number" id="m56" onchange="updateMatrix()">
        <br>
        <input type="number" id="m60" disabled>
        <input type="number" id="m61" disabled>
        <input type="number" id="m62" disabled>
        <input type="number" id="m63" disabled>
        <input type="number" id="m64" disabled>
        <input type="number" id="m65" disabled>
        <input type="number" id="m66" onchange="updateMatrix()" value="7">
    </form>

    <form id="bin-width">
        <label>Bin Width:</label>
        <input type="number" id="bin_width" onchange="updateMatrix()" value="3">
    </form>

</div>

<div id="bin-csr">
    <label>Bin-CSR:</label>
    <div id="diagonal" class="array"><label>diagonal:</label><span class="contents mono"></span></div>
    <div id="data" class="array"><label>data:</label><span class="contents mono"></span></div>
    <div id="column" class="array"><label>column:</label><span class="contents mono"></span></div>
    <div id="offset" class="array"><label>offset:</label><span class="contents mono"></span></div>
</div>

<script type="text/javascript">

    $(document).ready(updateMatrix);

    function getMatrixValue(row, col) {
        var getId = "#m" + row.toString() + col.toString();
        return $(getId)[0].value;
    }

    function setMatrixValue(row, col, val) {
        var getId = "#m" + row.toString() + col.toString();
        $(getId)[0].value = val;
    }

    function makeBin(width) {
        var bin = [];
        for (var i = 0; i < width; ++i) {
            bin.push([]);
        }
        return bin;
    }

    function binLength(bin, width) {
        var length = 0;
        for (var i = 0; i < width; ++i) {
            length = Math.max(length, bin[i].length);
        }
        return length;
    }

    function binArray(bin, width) {
        var length = binLength(bin, width);
        var vals = ['['];
        var cols = ['['];
        for (var j = 0; j < length; ++j) {
            for (var i = 0; i < width; ++i) {
                if (j < bin[i].length) {
                    vals.push(bin[i][j]['val']);
                    cols.push(bin[i][j]['col'])
                } else {
                    vals.push(0);
                    cols.push(0);
                }
            }
        }

        vals.push(']');
        cols.push(']');

        return { 'vals': vals, 'cols': cols };
    }

    function printArray($container, array) {
        nbsp = String.fromCharCode(160);
        array = array.map(x => (new Array(2 - x.toString().length + 1)).join(nbsp) + x);
        $container.text(array.join(''));
    }

    function updateMatrix() {

        // Force symmetry
        for (var i = 0; i < 7; i++) { 
            for (var j = i + 1; j < 7; j++) { 
                setMatrixValue(j, i, getMatrixValue(i, j));
            }
        }

        //
        var matrix_size = 7;
        var bin_width = $("#bin_width")[0].value;

        //
        var diag = [];
        var data = [];
        var column = [];
        var offset = [];

        // Update Bin-CSR representation
        var bin = makeBin(bin_width);
        var bin_id = 0;
        var rows_in_bin = 0;
        for (var row = 0; row < matrix_size; row++) {

            // Insert diagonals
            {
                var value = getMatrixValue(row, row);
                if (value) {
                    diag.push(value);
                } else {
                    diag.push(0);
                }
            }

            // Insert non-diagonal non-zeros
            for (var col = 0; col < matrix_size; col++) {
                if (row == col) {
                    continue;
                }

                // Add this value to the bin
                var value = getMatrixValue(row, col);
                if (value) {
                    bin[row % bin_width].push({ 'val':value, 'col':col });
                }
            }

            // Increment the bin once this one is full
            rows_in_bin++;
            if (rows_in_bin > bin_width || row == matrix_size - 1) {

                // Add this bin to the data array
                console.log(bin);
                var binValsCols = binArray(bin, bin_width);
                data = data.concat(binValsCols['vals']);
                column = column.concat(binValsCols['cols']);

                // Make a new bin
                bin = makeBin(bin_width);
                rows_in_bin = 0;
                bin_id++;
            }
        }

        // Populate the DOM elements
        printArray($("#bin-csr #diagonal .contents"), diag);
        printArray($("#bin-csr #data .contents"), data);
        printArray($("#bin-csr #column .contents"), column);
        printArray($("#bin-csr #offset .contents"), offset);
    }

</script>
