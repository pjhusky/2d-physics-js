class Voronoi {

    static calcCircumCenters( delaunay_tris ) {
        let circum_centers = new Array();
        for ( let i = 0; i < delaunay_tris.length; i++ ) {
            const triangle_T = Triangle.fromArray(delaunay_tris[i]);
            const circum_center_T = triangle_T.circumCenter();
            //circum_centers.push( circum_center_T.toArray() );
            circum_centers.push( new Array( circum_center_T.x, circum_center_T.y ) );
        }
        return circum_centers;
    }
    
    static approxEqual( x, y ) {
        // const zero_tolerance = 0.0000001;
        const zero_tolerance = 0.00001;
        return ( Math.abs( x - y ) < zero_tolerance );
    }

    static calculate( delaunay_tris ) {
        let paths = new Array();
        
        let circum_centers = this.calcCircumCenters( delaunay_tris );
        
        for ( let i = 0; i < delaunay_tris.length; i++ ) {
            //const triangle_T = Triangle.fromArray(delaunay_tris[i]);
            //const triangle = triangle_T.toArray();
            
            // const triangle = delaunay_tris[i];
            
            //const circum_center_T = triangle_T.circumCenter();
            let sub_paths = new Array();
            
            for ( let j = 0; j < delaunay_tris.length; j++ ) {
                if ( i == j ) { continue; }
                let common_verts = 0;
                
                //for k in range(0,len(triangles[i])):
                for ( let k = 0; k < 3; k++ ) { // verts in delaunay_tris[i]
                    //for n in range(0,len(triangles[j])):
                    for ( let n = 0; n < 3; n++ ) { // verts in delaunay_tris[j]
                        //if triangles[i][k] == triangles[j][n]:
                        //if ( delaunay_tris[i][k] == delaunay_tris[j][n] ) {
                        //if ( Math.abs( delaunay_tris[i][k] - delaunay_tris[j][n] ) < 0.0001 ) {
                        if ( this.approxEqual( delaunay_tris[i][k][0], delaunay_tris[j][n][0] ) && 
                             this.approxEqual( delaunay_tris[i][k][1], delaunay_tris[j][n][1] )) {
                            common_verts++;
                        }
                    }
                }
                
                //if commonpoints == 2:
                if ( common_verts == 2 ) {
                    //lines.append([list(centers[i][0]),list(centers[j][0])])
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