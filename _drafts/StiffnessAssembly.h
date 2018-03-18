namespace ductape
{
    /// \struct LocalStiffness
    /// \brief Represents stiffnesses and of individual element geometry
    /// in the mesh.
    struct LocalStiffness
    {
        /// \brief There should be one data block per 
        float* data;
    };


    /// \struct GlobalStiffness
    /// \brief Represents all stiffness relationships in the mesh.
    /// Computed from LocalStiffness and StiffnessMap. Must be
    /// recomputed whenever mesh connectivity changes.
    struct GlobalStiffness
    {
        /// \brief Offsets for each bin and for each row are
        /// computed and stored to provide access to the
        /// start of the non-zero entries for each row.
        int32_t* offset;

        /// \brief Diagonal matrix entries.
        float* diagonal;

        /// \brief Global binned data.
        float* data;
    };

    /// \struct StiffnessMap
    /// \brief Maps global stiffness entries to local entries.
    /// Depends on the geometry of the stiff mesh, and must be
    /// recomputed whenever mesh connectivity changes.
    struct StiffnessMap
    {
        /// \brief Contains packed arrays of indices into the local
        /// stiffness matrix array. The start of each packed array
        /// is stored in `offsets`. Called `eIndices` by Weber.
        int32_t* indices;

        /// \brief Each entry is an offset into `indices`,
        /// and corresponds to an nz entry in the global matrix.
        /// Therefore, the `offsets` array must be equal in length
        /// to the global data array. Called `eOffsets` by Weber.
        int32_t* offsets;
    };

    /// \class StiffnessAssembly
    /// \brief Structure for storing and manipulating local and global
    /// stiffness data.
    class StiffnessAssembly
    {
    public:

        LocalStiffness& local()
        {
            return _local;
        }

        const LocalStiffness& local() const
        {
            return _local;
        }

        const GlobalStiffness& global() const
        {
            return _global;
        }

    private:

        void update_map(const uint32_t* tetrahedron_nodes, uint32_t tetrahedron_count, uint32_t node_count)
        {
            /*
            IDEA: Populate `_map` in a 2 or 3 pass algo'.
            (1) Somehow compute the bin lengths. Maybe first find an array of N ints
                which measures the amount of shit in a row & take the max of all that
                later.
            (2) Use bin lengths & element counts to compute `offsets`.
            (3) Use `offsets` and one more iteration over the tetrahedra to populate
                `indices`.
            */

            const uint32_t bin_count = node_count / bin_width;

            uint32_t* counts = new uint32_t[node_count];

            // Compute Counts
            for (uint32_t tet_ind = 0; tet_ind < tetrahedron_count; ++tet_ind)
            {
                for (uint32_t local_node_ind = 0; local_node_ind < 4; ++local_node_ind)
                {
                    const uint32_t global_node_ind = tetrahedron_nodes[local_node_ind];
                    ++counts[global_node_ind];
                }
            }

            // Compute bin lengths & row offsets
            for (uint32_t bin_ind = 0; bin_ind < node_count / bin_width; ++bin_ind)
            {
                // Find the length of this bin
                uint32_t bin_length = 0;
                for (uint32_t local_row_ind = 0; local_row_ind < bin_width; ++local_row_ind)
                {
                    const uint32_t global_row_ind = bin_ind * bin_width;
                    const uint32_t row_length = counts[global_row_ind];
                    if (row_length > bin_length)
                    {
                        bin_length = row_length;
                    }
                }

                // Compute its row offset
            }

            delete[] counts;

            /*
            static const uint32_t inc = SimplexMeta::
            for (uint32_t i = 0; i < tetrahedron_count * 4; i += 4)
            {
                const uint32_t nodes[] =
                {
                    tetrahedron_nodes[i + 0],
                    tetrahedron_nodes[i + 1],
                    tetrahedron_nodes[i + 2],
                    tetrahedron_nodes[i + 3]
                };

                const uint32_t index = _map.offsets

                _map[];
            }
            */
        }

        void _update_global()
        {
            /*
            From Weber:

            1:  index ← offset[i];              // The index of the first global element in bin #`i`.
            2:  endIndex ← offset[i+bin_width]; // The index of the first global element in bin #`i+1`.
            3:  while index < endIndex do
            4:      data[index] = 0;
            5:      eStart ← eOffset[index];    // The first element in global entry #`index`.
            6:      eEnd ← eOffset[index+1];    // The first element in global entry #`index+1`.
            7:      for l = eStart → eEnd−1 do
            8:          k = eIndices[l];        // The index of the local stiffness
            9:          data[index] ← data[index]+Aek;
            10:     index ← index+bin_width;
            */
        }

        LocalStiffness _local;
        GlobalStiffness _global;
        StiffnessMap _map;
    };
}
