
class Voronoi {

    static calcCircumCenters( delaunay_tris ) {
        let circum_centers = new Array();
        for ( let i = 0; i < delaunay_tris.length; i++ ) {
            const triangle_T = Triangle.fromArray(delaunay_tris[i]);
            const circum_center_T = triangle_T.circumCenter();
            circum_centers.push( new Array( circum_center_T.x, circum_center_T.y ) );
        }
        return circum_centers;
    }
    
    // static approxEqual( x, y ) {
    //     const zero_tolerance = 0.00001;
    //     return ( Math.abs( x - y ) < zero_tolerance );
    // }

    static isVertexInList( vertex, vertex_list ) {
        //vertex_list.forEach( ( element ) => {
        for ( let i = 0; i < vertex_list.length; i++ ) {
            const element = vertex_list[i];
            if ( MathUtil.isApproxEqual( element[0], vertex[0] ) &&
                 MathUtil.isApproxEqual( element[1], vertex[1] ) ) {
                return true;
            }
        } 
        //);
        return false;
    }
    
    static clipVoronoiCellsToShape( voronoi_polygons, outer_tri, delaunay_inner_tris, boundary_delaunay_tris ) {
                
                // check if any of the voronoi cell vertices is inside any delaunay triangle
                // 1.) if all vertices are inside => keep voronoi polygon "as is"
                // 2.) if all vertices are outside => remove voronoi polygon entirely
                // 3.) if some vertices are inside, but some are outside, clip the polygon to the boundary edges
                
                // let inside_pt_idx = -1;
                // let outside_pt_idx = -1;
                // for ( let s = 0; s < voronoi_cell_poly.length; s++ ) {
                //     const voronoi_cell_pt_T = Vec2.fromArray( path_angle_and_pt_array[s][1] );
                //     //for ( let i = 0; i < delaunay_tris.length; i++ ) { 
                //     for ( let i = 0; i < delaunay_inner_tris.length; i++ ) { 
                //         //const delaunay_tri = delaunay_tris[i];
                //         const delaunay_tri = delaunay_inner_tris[i];
                //         //let pt_as_list = Triangle.fromArray( delaunay_tri ).circumCenter().toArray();
                //         const curr_T = Triangle.fromArray( delaunay_tri );
                //         const is_inside = curr_T.isPointInside( voronoi_cell_pt_T );
                //         if ( is_inside && inside_pt_idx < 0 ) {
                //             inside_pt_idx = s;
                //             if ( outside_pt_idx >= 0 ) { break; } // we know we have both inside & outside pts, so we need to clip - no need to test further!
                //         } else if ( !is_inside && outside_pt_idx < 0 ) {
                //             outside_pt_idx = s;
                //             if ( inside_pt_idx >= 0 ) { break; } // we know we have both inside & outside pts, so we need to clip - no need to test further!
                //         }
                //     }
                // }
                
                // if ( inside_pt_idx < 0 ) { // no inside pts (all points are outside)
                //     // there could still be an edge between two outside voronoi-cell vertices that overlaps the shape to be shattered
                //     continue; // for now...
                // } else if ( outside_pt_idx >= 0 ) { // there were inside AND outside points ==> clip polygon!
                // } else { // all points are inside - keep entire voronoi ... however, for concave base shape, we may need to clip as well as an edge may be partly outside
                // }
        
    }
    
    static calculateVoronoiCellsAsPolygons( delaunay_tris ) {
        // iterate through all vertices
        // for each vertex, get all triangles that share this vertex as one of their vertices
        // from those triangles get their circumcenters
        // connect the circumcenters CCW => the path forms the voronoi-cell boundary as a polygon
        
        // for the outermost polys, use boundary_delaunay_tris to CSG cut voronoi pattern agains input tris
        
        let voronoi_cell_polygons = new Array();
        let visited_verts = new Array();
        
        //delaunay_tris.array.forEach( (delaunay_tri) => {
        for ( let i = 0; i < delaunay_tris.length; i++ ) {            
            const delaunay_tri = delaunay_tris[i];
            let pt_as_list = Triangle.fromArray( delaunay_tri ).circumCenter().toArray();

            //delaunay_tri.forEach( (tri_vertex) => {
            for ( let v = 0; v < 3; v++ ) {
                const tri_vertex = delaunay_tri[v];
                if ( this.isVertexInList( tri_vertex, visited_verts ) ) { continue; }
                
                visited_verts.push( tri_vertex );
                
                // tri_vertex is the "center" of the current voronoi cell
                
                // the current triangle's circum center is thus in the voronoi-cell boundary polyline
                let voronoi_cell_poly = new Array();
                voronoi_cell_poly.push( pt_as_list );
                //voronoi_cell_poly.push( pt_as_list[0] );
                //voronoi_cell_poly.push( pt_as_list[1] );
                
                // find all triangles that contain this vertex and get their circum-center center points
                for ( let j = 0; j < delaunay_tris.length; j++ ) {
                    if ( i == j ) { continue; }
                    
                    const other_delaunay_tri = delaunay_tris[j];
                    //if ( !Delaunay.doesTriangleContainVertex( other_delaunay_tri, tri_vertex ) ) { continue; }
                    if ( !this.isVertexInList( tri_vertex, other_delaunay_tri ) ) { continue; }
                    
                    const other_delaunay_tri_T = Triangle.fromArray( other_delaunay_tri);
                    let other_pt_as_list = other_delaunay_tri_T.circumCenter().toArray();
                    voronoi_cell_poly.push( other_pt_as_list );
                    //voronoi_cell_poly.push( other_pt_as_list[0] );
                    //voronoi_cell_poly.push( other_pt_as_list[1] );
                }
                
                // sort voronoi-cell vertices CCW
                const tri_vertex_T = Vec2.fromArray(tri_vertex);
                let path_angle_and_pt_array = new Array();
                for ( let s = 0; s < voronoi_cell_poly.length; s++ ) {
                    const pos = voronoi_cell_poly[s];
                    const dvec = Vec2.sub( Vec2.fromArray( pos ), tri_vertex_T );
                    const angle_rad = Math.atan2( dvec.y, dvec.x );
                    path_angle_and_pt_array.push( new Array( angle_rad, pos ) );
                }
                path_angle_and_pt_array.sort( (a,b) => { 
                    if ( a[0] < b[0] ) { return -1; }
                    else if ( a[0] > b[0] ) { return 1; }
                    return 0;  
                } );
                
                // now path_angle_and_pt_array contains the current convex voronoi polygon / cell with CCW-sorted vertices
                
                voronoi_cell_poly = new Array();
                for ( let s = 0; s < path_angle_and_pt_array.length; s++ ) {
                    voronoi_cell_poly.push( path_angle_and_pt_array[s][1] );
                }
                voronoi_cell_polygons.push( voronoi_cell_poly );
                
                // final data "conversion" / preparation to match the format expected by outside plot function                
                // let voronoi_cell_poly_coords = [];
                // for ( let s = 0; s < path_angle_and_pt_array.length; s++ ) {
                //     voronoi_cell_poly_coords.push( path_angle_and_pt_array[s][1][0] );
                //     voronoi_cell_poly_coords.push( path_angle_and_pt_array[s][1][1] );
                // }                
                // voronoi_cell_polygons.push( voronoi_cell_poly_coords );
            }
            // );
        } 
        //);
        
        return voronoi_cell_polygons;
    }
    
    static calculate( delaunay_tris ) {
        let paths = new Array();
        
        let circum_centers = this.calcCircumCenters( delaunay_tris );
        
        for ( let i = 0; i < delaunay_tris.length; i++ ) {

            let sub_paths = new Array();
            
            for ( let j = 0; j < delaunay_tris.length; j++ ) {
                if ( i == j ) { continue; }
                let common_verts = 0;
                
                for ( let k = 0; k < 3; k++ ) { // verts in delaunay_tris[i]
                    for ( let n = 0; n < 3; n++ ) { // verts in delaunay_tris[j]
                        if ( MathUtil.isApproxEqual( delaunay_tris[i][k][0], delaunay_tris[j][n][0] ) && 
                             MathUtil.isApproxEqual( delaunay_tris[i][k][1], delaunay_tris[j][n][1] )) {
                            common_verts++;
                        }
                    }
                }
                
                if ( common_verts == 2 ) {
                    sub_paths.push( circum_centers[i][0] );
                    sub_paths.push( circum_centers[i][1] );
                    sub_paths.push( circum_centers[j][0] );
                    sub_paths.push( circum_centers[j][1] );
                }
            }
            if ( !sub_paths.empty ) {
                paths.push( sub_paths );
            }
        }
        
        return paths;
    }

}