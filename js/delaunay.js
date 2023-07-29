class Delaunay {
    
    static get_AABB( points ) {
        // let min_x = 10000000.0;
        // let max_x = -min_x;
        let min_x = points[0][0];
        let max_x = min_x;
        let min_y = points[0][1];
        let max_y = min_y ;
        
        points.forEach(
        //for ( point of points)
        (point) => {
            // const p_x = point.x;
            // const p_y = point.y;
            const p_x = point[0];
            const p_y = point[1];
            
            min_x = Math.min( min_x, p_x );
            max_x = Math.max( max_x, p_x );

            min_y = Math.min( min_y, p_y );
            max_y = Math.max( max_y, p_y );
        }
        )
        //return [ new Vec2( min_x, min_y ), new Vec2( max_x, max_y ) ];
        return new Array( new Array( min_x, min_y ), new Array( max_x, max_y ) );
    }
    
    // static delTriangleFromArray( tri_to_del ) {    
    // }
    
    static removeTri( in_tris, tri_to_remove ) {
        let out_tris = new Array();
        
        in_tris.forEach( (tri) => {
            // if ( tri )    
            if ( Delaunay.doesTriangleContainVertex( tri, tri_to_remove[0] ) &&
                 Delaunay.doesTriangleContainVertex( tri, tri_to_remove[1] ) &&
                 Delaunay.doesTriangleContainVertex( tri, tri_to_remove[2] ) ) {
                // don't add to new array ==> element is thus removed
            } else {
                out_tris.push( tri );
            }
            
        } );
        
        return out_tris;
    }

    static approxEqual( x, y ) {
        // const zero_tolerance = 0.0000001;
        const zero_tolerance = 0.00001;
        return ( Math.abs( x - y ) < zero_tolerance );
    }
    
    static doesTriangleContainVertex( triangle_points, vertex_to_test ) {
        for ( let i = 0; i < 3; i++ ) {
            if ( this.approxEqual( triangle_points[i][0], vertex_to_test[0] ) && 
                 this.approxEqual( triangle_points[i][1], vertex_to_test[1] ) ) {
                return true;
            }
        }
        return false;
    }

    static uniqueTris( in_tris ) {
        let out_tris = new Array(); //[];
        for ( let tri_idx = 0; tri_idx < in_tris.length; tri_idx++ ) {
            const in_tri_pt0 = in_tris[ tri_idx ][0];
            const in_tri_pt1 = in_tris[ tri_idx ][1];
            const in_tri_pt2 = in_tris[ tri_idx ][2];
            let is_unique = 1;
            for ( let i = 0; i < out_tris.length; i++ ) {
                if ( Delaunay.doesTriangleContainVertex( out_tris[i], in_tri_pt0 ) &&
                     Delaunay.doesTriangleContainVertex( out_tris[i], in_tri_pt1 ) &&
                     Delaunay.doesTriangleContainVertex( out_tris[i], in_tri_pt2 ) ) {
                    is_unique = 0;
                    break;
                }
            }
            if ( is_unique == 1 ) {
                out_tris.push( in_tris[ tri_idx ] );
            }
        }
        return out_tris;
    }

    static uniqueVerts( in_verts ) {
        let out_verts = new Array(); //[];
        for ( let vert_idx = 0; vert_idx < in_verts.length; vert_idx++ ) {
            const in_vert_x = in_verts[ vert_idx ][0];
            const in_vert_y = in_verts[ vert_idx ][1];
            
            let is_unique = 1;
            for ( let i = 0; i < out_verts.length; i++ ) {
                if ( ( this.approxEqual( out_verts[i][0], in_vert_x ) ) &&
                     ( this.approxEqual( out_verts[i][1], in_vert_y ) ) ) {
                    is_unique = 0;
                    break;
                }
            }
            if ( is_unique == 1 ) {
                out_verts.push( in_verts[ vert_idx ] );
            }
        }
        return out_verts;
    }
    
    static calculate( points ) {
        
        //return [ new Triangle( points[0], points[1], points[2] ) ];
        
        let [ min_AABB_pt, max_AABB_pt ] = Delaunay.get_AABB( points );
        
        let min_AABB_vec2 = new Vec2( min_AABB_pt[0], min_AABB_pt[1] );
        let max_AABB_vec2 = new Vec2( max_AABB_pt[0], max_AABB_pt[1] );
        
        console.log( `AABB B4:\n min=${min_AABB_pt.toString()}\n max=${max_AABB_pt}` );
        
        const center_AABB_vec2 = Vec2.add( min_AABB_vec2, max_AABB_vec2 ).scale(0.5);
        console.log( ` ## center_AABB_vec2 = ${center_AABB_vec2}` );
        // const AABB_scale_up = 2.1;
        // min_AABB_vec2 = Vec2.add( center_AABB_vec2, Vec2.sub( min_AABB_vec2, center_AABB_vec2 ).scale( AABB_scale_up ) );
        // max_AABB_vec2 = Vec2.add( center_AABB_vec2, Vec2.sub( max_AABB_vec2, center_AABB_vec2 ).scale( AABB_scale_up ) );

        const AABB_scale_up = 2.1;
        min_AABB_vec2 = Vec2.add( min_AABB_vec2, new Vec2( -180.0, -170.0 ) );
        max_AABB_vec2 = Vec2.add( max_AABB_vec2, new Vec2(  180.0,  170.0 ) );

        console.log( `AABB after min=${min_AABB_pt}, max=${max_AABB_pt}` );
        //console.log( `min=(${min_AABB_pt.x}|${min_AABB_pt.y}), max=(${max_AABB_pt.x}|${max_AABB_pt.y})` );
        
        min_AABB_pt[0] = min_AABB_vec2.x;
        min_AABB_pt[1] = min_AABB_vec2.y;
        max_AABB_pt[0] = max_AABB_vec2.x;
        max_AABB_pt[1] = max_AABB_vec2.y;
        
        //let delaunay_tris = [ [ min_AABB_pt, [ max_AABB_pt[0], min_AABB_pt[1] ], max_AABB_pt ], [ min_AABB_pt, [ max_AABB_pt[0], min_AABB_pt[1] ], max_AABB_pt ] ];
        //let delaunay_tris = [ [ min_AABB_pt, [ max_AABB_pt[0], min_AABB_pt[1] ], max_AABB_pt ] ];
        //let delaunay_tris = new Array( new Array( new Array( min_AABB_pt[0],min_AABB_pt[1] ), new Array( max_AABB_pt[0], min_AABB_pt[1] ), new Array( max_AABB_pt[0],max_AABB_pt[1] ) ) );
        
        let delaunay_tris = new Array( 
            new Array( 
                // new Array( min_AABB_pt[0],min_AABB_pt[1] ), 
                // new Array( center_AABB_vec2[0], max_AABB_pt[0][1] ), 
                // new Array( max_AABB_pt[0],min_AABB_pt[1] ) 

                new Array( 1.0, 1.0 ), 
                new Array( 350.0, 701.0 ), 
                new Array( 700.0, 1.0 ) 

            ) 
        );
        
        //! delaunay_tris = Delaunay.uniqueTris( delaunay_tris );
        //const delaunay_tris_unqiue = Delaunay.uniqueTris( delaunay_tris );
        //console.log( ` ## delaunay_tris_unqiue = ${delaunay_tris_unqiue}` );
        
        console.log( ` ## min_AABB_pt = ${min_AABB_pt}, min_AABB_vec2 = ${min_AABB_vec2}` );
        console.log( ` ## delaunay_tris = ${delaunay_tris}` );
        
        let curr_pt_idx = 0;
        const num_pts = points.length;
        
        while ( curr_pt_idx < num_pts ) {
            
            const curr_pt_to_add = points[curr_pt_idx];
            const curr_vec2 = new Vec2( curr_pt_to_add[0], curr_pt_to_add[1] );
            console.log( `${curr_pt_idx}: curr_pt = ${curr_pt_to_add}, curr_vec2=${curr_vec2}` );
            
            let delaunay_tri_idx = 0;
            let invalid_tris = [];
            
            //console.log( `delaunay_tris.length = ${delaunay_tris.length}` );
            
            while ( delaunay_tri_idx < delaunay_tris.length ) {
                
                const curr_delaunay_tri_T = Triangle.fromArray( delaunay_tris[ delaunay_tri_idx ] );
                const curr_delaunay_tri = curr_delaunay_tri_T.toArray();
                //const curr_delaunay_tri = delaunay_tris[ delaunay_tri_idx ];

                let [circum_center_vec2, radius] = Triangle.circumCenterAndRadis( 
                    // new Triangle( 
                    //     new Vec2(curr_delaunay_tri[0][0], curr_delaunay_tri[0][1]), 
                    //     new Vec2(curr_delaunay_tri[1][0], curr_delaunay_tri[1][1]),
                    //     new Vec2(curr_delaunay_tri[2][0], curr_delaunay_tri[2][1]) )
                    curr_delaunay_tri_T
                );
                const curr_dist = Vec2.dist( circum_center_vec2, curr_vec2 );

                console.log( `delaunay tri ${delaunay_tri_idx+1} of ${delaunay_tris.length} (${Triangle.fromArray( curr_delaunay_tri )}):\n curr_dist = ${curr_dist}, radius = ${radius}, circum_center = ${circum_center_vec2}` );
                if ( curr_dist < radius ) {
                    invalid_tris.push( curr_delaunay_tri );
                    //console.log( `After invalid_tris=${invalid_tris}` );
                }
                delaunay_tri_idx += 1;
            }
            
            
            let invalid_tri_vertices = new Array();
            for ( let invalid_tri_idx = 0; invalid_tri_idx < invalid_tris.length; invalid_tri_idx++ ) {

                const len_before_remove = delaunay_tris.length;
                delaunay_tris = Delaunay.removeTri( delaunay_tris, invalid_tris[invalid_tri_idx] );
                //console.log( `  after removeTri delaunay_tris.length = ${delaunay_tris.length}` );
                const len_after_remove = delaunay_tris.length;
                
                if ( len_before_remove != 1 + len_after_remove ) {
                    console.log( ` ######## --------- AAAAAAAAAAAAAAHHHHHHHHHHHHHHHHHHHHH ---------- ############ ` );
                }
                
                for ( let vert_idx = 0; vert_idx < 3; vert_idx++ ) {
                    invalid_tri_vertices.push( new Array( invalid_tris[ invalid_tri_idx ][ vert_idx ][0], invalid_tris[ invalid_tri_idx ][ vert_idx ][1] ) );
                }

            }
            delaunay_tris = Delaunay.uniqueTris( delaunay_tris );
            //console.log( `invalid_tri_vertices with potential duplicates len = ${invalid_tri_vertices.length}` ); 
            //const len_before = invalid_tri_vertices.length;
            
            invalid_tri_vertices = Delaunay.uniqueVerts(invalid_tri_vertices);
            
            // if ( len_before != invalid_tri_vertices.length ) {
            //     console.log( `removed ${len_before - invalid_tri_vertices.length} vertex duplicates!` );
            // }
            
            console.log( `invalid_tri_vertices = ${invalid_tri_vertices}` );
            
            for ( let i = 0; i < invalid_tri_vertices.length; i++ ) {
                for ( let j = i + 1; j < invalid_tri_vertices.length; j++ ) {
                    let num_occurrences = 0;
                    for ( let k = 0; k < invalid_tris.length; k++ ) {
                        if ( Delaunay.doesTriangleContainVertex( invalid_tris[k], invalid_tri_vertices[i] ) &&
                             Delaunay.doesTriangleContainVertex( invalid_tris[k], invalid_tri_vertices[j] ) ) {
                                //console.log( " *** found occurrence! *** " );
                                num_occurrences++;
                        }
                    }
                    if ( num_occurrences == 1 ) {
                        //delaunay_tris.push( [ invalid_tri_vertices[j], invalid_tri_vertices[i], curr_pt_to_add ] );
                        delaunay_tris.push( 
                            new Array(
                                new Array( invalid_tri_vertices[j][0], invalid_tri_vertices[j][1] ), 
                                new Array( invalid_tri_vertices[i][0], invalid_tri_vertices[i][1] ), 
                                new Array( curr_pt_to_add[0], curr_pt_to_add[1] )
                         ) );
                    }
                }
            }
            //console.log( `added several new Delaunay tris: ${delaunay_tris}` );

            
            for ( let dt_idx = 0; dt_idx < delaunay_tris.length; dt_idx++ ) {
                
                const curr_delaunay_tri = delaunay_tris[ dt_idx ];

                console.log( `pt add finish delaunay tri ${dt_idx+1} of ${delaunay_tris.length} (${Triangle.fromArray( curr_delaunay_tri )})` );
            }
            
            curr_pt_idx++;
        }
        
    
        return delaunay_tris;
    }
}