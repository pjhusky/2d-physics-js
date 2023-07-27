class Delaunay {
    
    static get_AABB( points ) {
        let min_x = 10000000.0;
        let max_x = -min_x;
        let min_y = min_x;
        let max_y = max_x;
        
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
        return [ [ min_x, min_y ], [ max_x, max_y ] ];
    }
    
    // static delTriangleFromArray( tri_to_del ) {    
    // }
    
    static removeTri( in_tris, tri_to_remove ) {
        let out_tris = [];
        
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
        return ( Math.abs( x - y ) < 0.0000001 );
    }
    
    // static containsTriangleVertex( triangle_points, vertex_to_test ) {
    //     for ( let i = 0; i < 3; i++ ) {
    //         if ( triangle_points[i].x == vertex_to_test.x && 
    //              triangle_points[i].y == vertex_to_test.y ) {
    //             return true;
    //         }
    //     }
    //     return false;
    // }
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
        const AABB_scale_up = 1.0;
        min_AABB_vec2 = Vec2.add( center_AABB_vec2, Vec2.sub( min_AABB_vec2, center_AABB_vec2 ).scale( AABB_scale_up ) );
        max_AABB_vec2 = Vec2.add( center_AABB_vec2, Vec2.sub( max_AABB_vec2, center_AABB_vec2 ).scale( AABB_scale_up ) );
        console.log( `AABB after min=${min_AABB_pt}, max=${max_AABB_pt}` );
        //console.log( `min=(${min_AABB_pt.x}|${min_AABB_pt.y}), max=(${max_AABB_pt.x}|${max_AABB_pt.y})` );
        
        min_AABB_pt[0] = min_AABB_vec2.x;
        min_AABB_pt[1] = min_AABB_vec2.y;
        max_AABB_pt[0] = max_AABB_vec2.x;
        max_AABB_pt[1] = max_AABB_vec2.y;
        //let delaunay_tris = [ new Triangle( min_AABB_pt, new Vec2( max_AABB_pt.x, min_AABB_pt.y ), max_AABB_pt ) ];
        //let delaunay_tris = [ [ min_AABB_pt.x, min_AABB_pt.y ] , [ max_AABB_pt.x, min_AABB_pt.y ], [ max_AABB_pt.x, max_AABB_pt.y ] ];
        //let delaunay_tris = [ [ min_AABB_pt, [ max_AABB_pt[0], min_AABB_pt[1] ], max_AABB_pt ] ];
        
        let delaunay_tris = [ [ min_AABB_pt, [ max_AABB_pt[0], min_AABB_pt[1] ], max_AABB_pt ], [ min_AABB_pt, [ max_AABB_pt[0], min_AABB_pt[1] ], max_AABB_pt ] ];
        //let delaunay_tris = [ [ points[0], points[1], points[2] ] ];
        
        //let delaunay_tris = [];
        //let delaunay_tris = new Set( [ new Triangle( min_AABB_pt, new Vec2( max_AABB_pt.x, min_AABB_pt.y ), max_AABB_pt ) ] );
        
        //let delaunay_tris = [ new Triangle( new Vec2( max_AABB_pt.x, min_AABB_pt.y ), min_AABB_pt, max_AABB_pt ) ];
        //return delaunay_tris;
        
        //let delaunay_tris = [ new Triangle( points[0], points[1], points[2] ) ];
        
        // let delaunay_tris_set = new Set( delaunay_tris );
        // // let delaunay_tris_set = new Set();
        // // delaunay_tris.forEach( dt => {
        // //     delaunay_tris_set.add( dt );
        // // } );
        // console.log( `delaunay_tris_set (${delaunay_tris_set.size} elements):` );
        // delaunay_tris_set.forEach( el => {console.log(el.toString());} )
        
        delaunay_tris = Delaunay.uniqueTris( delaunay_tris );
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
                const curr_delaunay_tri = delaunay_tris[ delaunay_tri_idx ];
                //let [circum_center, radius] = Triangle.circumCenterAndRadis( curr_delaunay_tri );
                //console.log( `curr_delaunay_tri = ${curr_delaunay_tri}` );
                let [circum_center, radius] = Triangle.circumCenterAndRadis( 
                    new Triangle( 
                        new Vec2(curr_delaunay_tri[0][0], curr_delaunay_tri[0][1]), 
                        new Vec2(curr_delaunay_tri[1][0], curr_delaunay_tri[1][1]),
                        new Vec2(curr_delaunay_tri[2][0], curr_delaunay_tri[2][1]) )
                 );
                const curr_dist = Vec2.dist( circum_center, curr_vec2 );
                //console.log( `curr_dist = ${curr_dist}, radius = ${radius}, circum_center = (${circum_center.x}|${circum_center.y})` );
                //console.log( `curr_dist = ${curr_dist}, radius = ${radius}, circum_center = ${circum_center.toString()}` );
                if ( curr_dist < radius ) {
                    //invalid_tris.push( curr_delaunay_tri );
                    //invalid_tris.push( [ [curr_delaunay_tri.p0.x, curr_delaunay_tri.p0.y], [curr_delaunay_tri.p1.x, curr_delaunay_tri.p1.y], [curr_delaunay_tri.p2.x, curr_delaunay_tri.p2.y] ] );
                    //console.log( `B4    invalid_tris=${invalid_tris}` );
                    invalid_tris.push( curr_delaunay_tri );
                    //console.log( `After invalid_tris=${invalid_tris}` );
                }
                delaunay_tri_idx += 1;
            }
            
            
            let invalid_tri_vertices = [];
            for ( let invalid_tri_idx = 0; invalid_tri_idx < invalid_tris.length; invalid_tri_idx++ ) {
                //console.log( `B4 remove delaunay_tris.length = ${delaunay_tris.length}` );
                //delaunay_tris = delaunay_tris.filter( function(tri){ return tri != invalid_tris[invalid_tri_idx] } ); // does != actually work as expected (ref compare, or val compare ???)
                
                
                // let delaunay_tris_set = new Set();
                // delaunay_tris.forEach( (delaunay_tri) => {
                //     delaunay_tris_set.add( [ delaunay_tri.p0.x, delaunay_tri.p0.y ] );
                //     delaunay_tris_set.add( [ delaunay_tri.p1.x, delaunay_tri.p1.y ] );
                //     delaunay_tris_set.add( [ delaunay_tri.p2.x, delaunay_tri.p2.y ] );
                // } );
                
                //let delaunay_tris_set = new Set( delaunay_tris );
              
                
                //console.log( `  B4 removeTri delaunay_tris.length = ${delaunay_tris.length}` );
                const len_before_remove = delaunay_tris.length;
                delaunay_tris = Delaunay.removeTri( delaunay_tris, invalid_tris[invalid_tri_idx] );
                //console.log( `  after removeTri delaunay_tris.length = ${delaunay_tris.length}` );
                const len_after_remove = delaunay_tris.length;
                
                if ( len_before_remove != 1 + len_after_remove ) {
                    console.log( ` ######## --------- AAAAAAAAAAAAAAHHHHHHHHHHHHHHHHHHHHH ---------- ############ ` );
                }
                
                //delaunay_tris_set.delete( invalid_tris[invalid_tri_idx] );
                //delaunay_tris = [];
                //let delaunay_tris_tmp = Array.from( delaunay_tris_set );
                //delaunay_tris = Array.from( delaunay_tris_set );
                
                
                //console.log( `  after uniqueTris delaunay_tris.length = ${delaunay_tris.length}` );
                
                //console.log( `delaunay_tris_tmp.length = ${delaunay_tris_tmp.length}, delaunay_tris_set.size = ${delaunay_tris_set.size}` );
                
                // for ( let i = 0; i < delaunay_tris_tmp.length / 3; i++ ) {
                //     delaunay_tris.push( new Triangle( 
                //         new Vec2( delaunay_tris_tmp[ i * 3 + 0 ][0], delaunay_tris_tmp[ i * 3 + 0 ][1] ),
                //         new Vec2( delaunay_tris_tmp[ i * 3 + 1 ][0], delaunay_tris_tmp[ i * 3 + 1 ][1] ),
                //         new Vec2( delaunay_tris_tmp[ i * 3 + 2 ][0], delaunay_tris_tmp[ i * 3 + 2 ][1] ) ) );
                // }
                //console.log( `delaunay_tris.length = ${delaunay_tris.length}` );
                
                //console.log( `after remove delaunay_tris.length = ${delaunay_tris.length}` );
                // for ( let vert_idx = 0; vert_idx < 3; vert_idx++ ) {
                //     invalid_tri_vertices.push( invalid_tris[ invalid_tri_idx ].points[ vert_idx ] );
                // }

                for ( let vert_idx = 0; vert_idx < 3; vert_idx++ ) {
                    invalid_tri_vertices.push( invalid_tris[ invalid_tri_idx ][ vert_idx ] );
                }

                // invalid_tri_vertices.push( invalid_tris[ invalid_tri_idx ].p0 );
                // invalid_tri_vertices.push( invalid_tris[ invalid_tri_idx ].p1 );
                // invalid_tri_vertices.push( invalid_tris[ invalid_tri_idx ].p2 );
            }
            delaunay_tris = Delaunay.uniqueTris( delaunay_tris );
            //console.log( `invalid_tri_vertices with potential duplicates len = ${invalid_tri_vertices.length}` ); 
            const len_before = invalid_tri_vertices.length;
            
            //let invalid_tri_vertices_set = new Set( invalid_tri_vertices );
            //invalid_tri_vertices = Array.from( invalid_tri_vertices_set );
            invalid_tri_vertices = Delaunay.uniqueVerts(invalid_tri_vertices);
            
            // let invalid_tri_vertices_set = new Set();
            // invalid_tri_vertices.forEach( (invalid_tri_vert) => {
            //     invalid_tri_vertices_set.add( [ invalid_tri_vert.x, invalid_tri_vert.y ] )
            // } );
            // let invalid_tri_vertices_tmp = Array.from( invalid_tri_vertices_set );
            // invalid_tri_vertices = []
            // invalid_tri_vertices_tmp.forEach( (invalid_tri_vert_tmp) => {
            //     invalid_tri_vertices.push( new Vec2( invalid_tri_vert_tmp[0], invalid_tri_vert_tmp[1] ) );
            // } );
            
            
            //console.log( `invalid_tri_vertices only unique entries len = ${invalid_tri_vertices.length}` );
            if ( len_before != invalid_tri_vertices.length ) {
                console.log( `removed ${len_before - invalid_tri_vertices.length} vertex duplicates!` );
            }
            
            
            for ( let i = 0; i < invalid_tri_vertices.length; i++ ) {
                for ( let j = i + 1; j < invalid_tri_vertices.length; j++ ) {
                    let num_occurrences = 0;
                    for ( let k = 0; k < invalid_tris.length; k++ ) {
                        if ( //invalid_tris[k].points.includes( invalid_tri_vertices[i] ) &&
                             //invalid_tris[k].includes( invalid_tri_vertices[i] ) &&
                             //Delaunay.containsTriangleVertex( invalid_tris[k].points, invalid_tri_vertices[i] ) &&
                             Delaunay.doesTriangleContainVertex( invalid_tris[k], invalid_tri_vertices[i] ) &&
                             //invalid_tris[k].points.includes( invalid_tri_vertices[j] ) ) {
                             
                             //invalid_tris[k].includes( invalid_tri_vertices[j] ) ) {
                             //Delaunay.containsTriangleVertex( invalid_tris[k].points, invalid_tri_vertices[j] ) ) {
                                Delaunay.doesTriangleContainVertex( invalid_tris[k], invalid_tri_vertices[j] ) ) {
                                //console.log( " *** found occurrence! *** " );
                                num_occurrences++;
                        }
                    }
                    if ( num_occurrences == 1 ) {
                        //delaunay_tris.push( new Triangle( invalid_tri_vertices[i], invalid_tri_vertices[j], curr_pt ) );
                        //delaunay_tris.push( new Triangle( invalid_tri_vertices[j], invalid_tri_vertices[i], curr_pt ) );
                        delaunay_tris.push( [ invalid_tri_vertices[j], invalid_tri_vertices[i], curr_pt_to_add ] );
                    }
                }
            }
            //console.log( `added several new Delaunay tris: ${delaunay_tris}` );
            
            curr_pt_idx++;
        }
        return delaunay_tris;
    }
}