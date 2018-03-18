namespace ductape
{
    template <uint32_t Dim>
    struct SimplexMeta
    {
        static_assert(Dim > 0, "Zero dimensional simplices are not valid.");
        static_assert(Dim < 4, "Only simplices up to three dimensions are valid.");
        static const uint32_t vertex_count = Dim + 1;
    };

    /// \struct LocalStiffness
    /// \brief Represents stiffnesses and of individual element geometry
    /// in the mesh, as well as stiffness warping data.
    template <typename DataT, typename WarpT, uint32_t Dim>
    struct LocalStiffness
    {
        /// \brief There should be one data block per 
        DataT* data;

        /// \brief There should be one warp per mesh element
        WarpT* warp;
    };


    /// \struct GlobalStiffness
    /// \brief Represents all stiffness relationships in the mesh.
    /// Computed from LocalStiffness and StiffnessMap. Must be
    /// recomputed whenever mesh connectivity changes.
    template <typename DataT>
    struct GlobalStiffness
    {
        /// \brief Offsets for each bin and for each row are
        /// computed and stored to provide access to the
        /// start of the non-zero entries for each row.
        int32_t* offset;

        /// \brief Diagonal matrix entries.
        DataT* diagonal;

        /// \brief Global binned data.
        DataT* data;
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

    using DefaultDataT = float[9];

    using DefaultWarpT = float[9];

    /// \class StiffnessAssembly
    /// \brief Structure for storing and manipulating local and global
    /// stiffness data.
    ///
    /// \param DataT : Storage type for each block of mesh node stiffness data. Usually a 3x3 matrix.
    /// \param WarpT : Storage type for each tetrahedron's warp data.
    /// \param WarpF : Functor type which can update DataT entries.
    template <typename DataT, typename WarpT, typename WarpF>
    class StiffnessAssembly
    {
    public:

        using LocalStiffnessT = LocalStiffness<DataT, WarpT>;
        using GlobalStiffnessT = GlobalStiffness<DataT>;

        LocalStiffnessT& local()
        {
            return _local;
        }

        const LocalStiffnessT& local() const
        {
            return _local;
        }

        const GlobalStiffnessT& global() const
        {
            return _global;
        }

    private:

        void update_map(const uint32_t* tetrahedron_adjacencies, uint32_t tetrahedron_count)
        {
            static const uint32_t inc = SimplexMeta::
            for (uint32_t i = 0; i < tetrahedron_count * 4; i += 4)
            {
                tetrahedron_adjacencies[i + 0];
                tetrahedron_adjacencies[i + 1];
                tetrahedron_adjacencies[i + 2];
                tetrahedron_adjacencies[i + 3];


            }
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

        LocalStiffness<DataT, WarpT> _local;
        GlobalStiffness<DataT> _global;
        StiffnessMap _map;
    };
}
