//
// BIN-CSR Data Structures
//

var BinIntermediate = BinIntermediate || class {
    constructor() {
        this.val = [];
        this.col = [];
        this.length = 0;
    }
}

var BinCSRIntermediate = BinCSRIntermediate || class {
    constructor(width, matrix=[[]]) {
        this.width = width;
        this.set_matrix(matrix);
    }

    set_matrix(matrix) {

        this.rows = matrix.length;
        this.bins = [];
        this.diag = [];
        this.size = matrix.length;

        // Add each row to its bin
        var bin_index = -1;
        for (var row = 0; row < this.rows; ++row) {

            // Make a new bin if needed
            if (row % this.width == 0) {
                ++bin_index;
                this.bins.push(new BinIntermediate());
            }

            // Add the data to the bin
            var bin = this.bins[bin_index];
            var vals = [];
            var cols = [];
            for (var col = 0; col < matrix.length; ++col) {
                var val = matrix[row][col];
                if (row == col) {
                    this.diag.push(val);
                } else if (val != 0) {
                    vals.push(val);
                    cols.push(col);
                }
            }

            bin.val.push(vals);
            bin.col.push(cols);
            bin.length = Math.max(bin.length, vals.length);
        }
    }
}

var BinCSR = BinCSR || class {
    constructor(inter) {
        this.set_inter(inter);
    }

    set_inter(inter) {
        this.width = inter.width;
        this.ptr = [];
        this.col = [];
        this.val = [];
        this.dia = [];

        // Initialize the ptr array, with a zero for each row.
        // Also, do the diagonals while we're at it.
        for (var i = 0; i < inter.rows; ++i) {
            this.ptr.push(0);
            this.dia.push(inter.diag[i]);
        }

        // Add bin data to arrays
        var bin_pos = 0; // position of the beginning of the current bin in the val and col arrays
        for (var bin_index = 0; bin_index < inter.bins.length; ++bin_index) {
            var bin = inter.bins[bin_index];

            for (var row_local = 0; row_local < bin.val.length; ++row_local) {
                var row = (bin_index * this.width) + row_local;

                // Store a pointer to the beginning of this row
                var row_pos = bin_pos + (bin.length > 0 ? row_local : 0);
                this.ptr[row] = row_pos;

                for (var i = 0; i < bin.length; ++i) {
                    var index = row_pos + (i * this.width);
                    var val = i < bin.val[row_local].length ? bin.val[row_local][i] : 0;
                    var col = i < bin.col[row_local].length ? bin.col[row_local][i] : 0;

                    // Pad the val and col arrays
                    while (this.val.length < index + 1) { this.val.push(0); }
                    while (this.col.length < index + 1) { this.col.push(0); }

                    // Insert the data
                    this.val[index] = val;
                    this.col[index] = col;
                }
            }

            // 
            bin_pos += bin.length * this.width;
        }
    }
}
