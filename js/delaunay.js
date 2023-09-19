"use strict";

// import { Vec2 } from './vec2.js';
// import { MathUtil } from './mathUtil.js';
// import { Triangle } from './triangle.js';

//export
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
    
    static doesTriangleContainVertex( triangle_points, vertex_to_test ) {
        for ( let i = 0; i < 3; i++ ) {
            if ( MathUtil.isApproxEqual( triangle_points[i][0], vertex_to_test[0] ) && 
                 MathUtil.isApproxEqual( triangle_points[i][1], vertex_to_test[1] ) ) {
                return true;
            }
        }
        return false;
    }

    static uniqueTris( in_tris ) {
        let out_tris = []; //[];
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
        let out_verts = []; //[];
        for ( let vert_idx = 0; vert_idx < in_verts.length; vert_idx++ ) {
            const in_vert_x = in_verts[ vert_idx ][0];
            const in_vert_y = in_verts[ vert_idx ][1];
            
            let is_unique = 1;
            for ( let i = 0; i < out_verts.length; i++ ) {
                if ( ( MathUtil.isApproxEqual( out_verts[i][0], in_vert_x ) ) &&
                     ( MathUtil.isApproxEqual( out_verts[i][1], in_vert_y ) ) ) {
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
    
    static createBoundingTri( points ) {
        let [ min_AABB_pt, max_AABB_pt ] = Delaunay.get_AABB( points );
        
        let min_AABB_vec2 = new Vec2( min_AABB_pt[0], min_AABB_pt[1] );
        let max_AABB_vec2 = new Vec2( max_AABB_pt[0], max_AABB_pt[1] );
        
        //console.log( `AABB B4:\n min=${min_AABB_pt.toString()}\n max=${max_AABB_pt}` );
        
        const center_AABB_vec2 = Vec2.add( min_AABB_vec2, max_AABB_vec2 ).scale(0.5);
        //console.log( ` ## center_AABB_vec2 = ${center_AABB_vec2}` );
        // const AABB_scale_up = 2.1;
        // min_AABB_vec2 = Vec2.add( center_AABB_vec2, Vec2.sub( min_AABB_vec2, center_AABB_vec2 ).scale( AABB_scale_up ) );
        // max_AABB_vec2 = Vec2.add( center_AABB_vec2, Vec2.sub( max_AABB_vec2, center_AABB_vec2 ).scale( AABB_scale_up ) );

        const AABB_scale_up = 0.75;
        const max_len = AABB_scale_up * Math.SQRT2 * Math.max( 100.0, 
            Math.max(   Vec2.sub( min_AABB_vec2, center_AABB_vec2 ).len(),
                        Vec2.sub( max_AABB_vec2, center_AABB_vec2 ).len() ) );
                        
        
        // min_AABB_vec2 = Vec2.add( min_AABB_vec2, new Vec2( -180.0, -170.0 ) );
        // max_AABB_vec2 = Vec2.add( max_AABB_vec2, new Vec2(  180.0,  170.0 ) );

        min_AABB_vec2 = Vec2.add( min_AABB_vec2, new Vec2( -max_len, -max_len ) );
        max_AABB_vec2 = Vec2.add( max_AABB_vec2, new Vec2(  max_len,  max_len ) );
        //console.log( ` ## min_AABB_vec2 = ${min_AABB_vec2}, max_AABB_vec2 = ${max_AABB_vec2}` );
        
        const deg30_in_radians = ( Math.PI / 180.0 ) * 30.0;
        const tan_30_deg = Math.tan( deg30_in_radians );
        const len_x = max_len / tan_30_deg;

        const deg60_in_radians = ( Math.PI / 180.0 ) * 60.0;
        const tan_60_deg = Math.tan( deg60_in_radians );
        const len_y = len_x * tan_60_deg - max_len;
        
        //console.log( `max_len = ${max_len}, len_x = ${len_x}, len_y = ${len_y}` );
        
        const center_btm = Vec2.add( center_AABB_vec2, new Vec2( 0.0, -max_len ) );
        const left_x = Vec2.add( center_btm, new Vec2( -len_x, 0.0 ) );
        const right_x = Vec2.add( center_btm, new Vec2( len_x, 0.0 ) );
        const center_top = Vec2.add( center_AABB_vec2, new Vec2( 0.0, len_y ) );
        
        
        // console.log( `AABB after min=${min_AABB_pt}, max=${max_AABB_pt}` );
        // //console.log( `min=(${min_AABB_pt.x}|${min_AABB_pt.y}), max=(${max_AABB_pt.x}|${max_AABB_pt.y})` );
        
        // min_AABB_pt[0] = min_AABB_vec2.x;
        // min_AABB_pt[1] = min_AABB_vec2.y;
        // max_AABB_pt[0] = max_AABB_vec2.x;
        // max_AABB_pt[1] = max_AABB_vec2.y;
        // console.log( ` ## min_AABB_pt = ${min_AABB_pt}, min_AABB_vec2 = ${min_AABB_vec2}` );

        //console.log( ` ## center_top = ${center_top}, left_x = ${left_x}, right_x = ${right_x}` );
        
        return new Array( 
            // new Array( min_AABB_pt[0],min_AABB_pt[1] ), 
            // new Array( center_AABB_vec2[0], max_AABB_pt[0][1] ), 
            // new Array( max_AABB_pt[0],min_AABB_pt[1] ) 

            // new Array( 1.0, 1.0 ), 
            // new Array( 350.0, 701.0 ), 
            // new Array( 700.0, 1.0 ) 
            center_top.toArray(),
            left_x.toArray(),
            right_x.toArray()
        );
    }

    static delaunayTrisWithoutBoundTris( delaunay_tris, boundary_tris_to_remove ) {
        //console.log( `boundary_tris_to_remove = ${boundary_tris_to_remove}, count = ${boundary_tris_to_remove.length}` );
        
        let delaunay_tris_ret = [];
        delaunay_tris.forEach( (tri) => {
            delaunay_tris_ret.push( tri );
        } );
        
        for ( let i = 0; i < boundary_tris_to_remove.length; i++ ) {
            delaunay_tris_ret = this.removeTri( delaunay_tris_ret, boundary_tris_to_remove[i] );
        }
        
        return delaunay_tris_ret;
    }

    
    static calculate( points, remove_boundary_tris ) {
        
        //return [ new Triangle( points[0], points[1], points[2] ) ];
        
        const outer_tri = this.createBoundingTri( points );

        let delaunay_tris = new Array( outer_tri );
        
        //! delaunay_tris = Delaunay.uniqueTris( delaunay_tris );
        //const delaunay_tris_unqiue = Delaunay.uniqueTris( delaunay_tris );
        //console.log( ` ## delaunay_tris_unqiue = ${delaunay_tris_unqiue}` );
        
        
        //console.log( ` ## delaunay_tris = ${delaunay_tris}` );
        
        let curr_pt_idx = 0;
        const num_pts = points.length;
        
        while ( curr_pt_idx < num_pts ) {
            
            const curr_pt_to_add = points[curr_pt_idx];
            const curr_vec2 = new Vec2( curr_pt_to_add[0], curr_pt_to_add[1] );
            //console.log( `${curr_pt_idx}: curr_pt = ${curr_pt_to_add}, curr_vec2=${curr_vec2}` );
            
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

                //console.log( `delaunay tri ${delaunay_tri_idx+1} of ${delaunay_tris.length} (${Triangle.fromArray( curr_delaunay_tri )}):\n curr_dist = ${curr_dist}, radius = ${radius}, circum_center = ${circum_center_vec2}` );
                if ( curr_dist < radius ) {
                    invalid_tris.push( curr_delaunay_tri );
                    //console.log( `After invalid_tris=${invalid_tris}` );
                }
                delaunay_tri_idx += 1;
            }
            
            
            let invalid_tri_vertices = [];
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
            
            //console.log( `invalid_tri_vertices = ${invalid_tri_vertices}` );
            
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

            
            // for ( let dt_idx = 0; dt_idx < delaunay_tris.length; dt_idx++ ) {
                
            //     const curr_delaunay_tri = delaunay_tris[ dt_idx ];

            //     //console.log( `pt add finish delaunay tri ${dt_idx+1} of ${delaunay_tris.length} (${Triangle.fromArray( curr_delaunay_tri )})` );
            // }
            
            curr_pt_idx++;
        }
 
        
        let boundary_tris_to_remove = [];
        // let boundary_edges = [];
        for ( let i = 0; i < delaunay_tris.length; i++ ) {
            let tri = delaunay_tris[i];
            for ( let k = 0; k < 3; k++ ) {
                const init_tri_vertex = outer_tri[k];
                if ( Delaunay.doesTriangleContainVertex( tri, init_tri_vertex ) ) {
                    boundary_tris_to_remove.push( tri );
                    
                    //! console.log( `tri to remove = ${Triangle.fromArray( tri )}` );
                    
                    // let boundary_edge = [];
                    // for ( let j = 0; j < tri.length; j++ ) {
                    //     //if ( k == j ) continue;
                    //     //const vertex = init_tri[j];
                        
                    //     const vertex = tri[j];
                    //     // if ( MathUtil.isApproxEqual( vertex[0], init_tri_vertex[0] ) && 
                    //     //      MathUtil.isApproxEqual( vertex[1], init_tri_vertex[1] )) { continue; }
                        
                    //     let num_outer_tri_vertices = 0;
                    //     //for ( let t = 0; t < init_tri.length; t++ ) {
                    //     for ( let t = 0; t < 3; t++ ) {
                    //         if ( this.doesTriangleContainVertex( tri, init_tri[t] ) ) { num_outer_tri_vertices++; }
                    //     }
                    //     if ( num_outer_tri_vertices == 1 ) {
                    //         boundary_edge.push( new Array( vertex[0], vertex[1] ) );
                    //     }
                    // }
                    // //if ( !MathUtil.isApproxEqual( Vec2.dist( Vec2.fromArray( boundary_edge[0] ), Vec2.fromArray( boundary_edge[1] ) ) ) ) {
                    // if ( boundary_edge.length != 0 ) {
                    //     boundary_edges.push( boundary_edge );
                    // }
                    //}
                    break;
                }
            }
        }
        
        let boundary_edges_not_sorted = [];
        for ( let i = 0; i < delaunay_tris.length; i++ ) {
            let current_tri = delaunay_tris[i];
            
            let contained_tri_vert_indices = [];
            for ( let t = 0; t < 3; t++ ) {
                const outer_tri_vertex = outer_tri[t];
                if ( this.doesTriangleContainVertex( current_tri, outer_tri_vertex ) ) { 
                    contained_tri_vert_indices.push(t);
                }
            }

            if ( contained_tri_vert_indices.length == 1 ) {
                const shared_init_tri_vertex = outer_tri[ contained_tri_vert_indices[0] ];
                let boundary_edge = [];
                for ( let v = 0; v < 3; v++ ) {
                    const current_vertex = current_tri[v];
                    
                    if ( MathUtil.isApproxEqual( current_vertex[0], shared_init_tri_vertex[ 0 ] ) ||
                         MathUtil.isApproxEqual( current_vertex[1], shared_init_tri_vertex[ 1 ] ) ) { continue; }
                    boundary_edge.push( new Array( current_vertex[0], current_vertex[1] ) );
                }
                if ( boundary_edge.length == 2 ) {
                    boundary_edges_not_sorted.push( boundary_edge );
                } else {
                    //boundary_edge.push( new Array( boundary_edge[0][0]-0.02, boundary_edge[0][1]+0.02 ) );
                    //boundary_edges_not_sorted.push( boundary_edge );
                    console.log( `boundary_edge.length should be 2, but is ${boundary_edge.length}` );
                }
            }    
        }
        
        // sort boundary edges such that they form a continuous sequence of edges
        let boundary_edges = [];
        if ( boundary_edges_not_sorted.length > 0 ) {
            boundary_edges.push( boundary_edges_not_sorted[0] );
            boundary_edges_not_sorted.shift(); // pop front
            
            let boundary_edges_len = boundary_edges.length;
            
            while ( boundary_edges_not_sorted.length > 0 ) {
                
                const last_sorted_boundary_edge_idx = boundary_edges.length - 1;
                const last_sorted_vertex = boundary_edges[last_sorted_boundary_edge_idx][1];        
                
                for ( let i = 0; i < boundary_edges_not_sorted.length; i++ ) {
                    const curr_edge = boundary_edges_not_sorted[i];
                    if ( MathUtil.isApproxEqual( last_sorted_vertex[0], curr_edge[0][0] ) &&
                        MathUtil.isApproxEqual( last_sorted_vertex[1], curr_edge[0][1] ) ) {
                        boundary_edges.push( curr_edge );                    
                        boundary_edges_not_sorted.splice(i,1);
                        break;
                    }
                    //console.log( `curr_edge = ${curr_edge}` );
                    if ( MathUtil.isApproxEqual( last_sorted_vertex[0], curr_edge[1][0] ) &&
                        MathUtil.isApproxEqual( last_sorted_vertex[1], curr_edge[1][1] ) ) {
                        boundary_edges.push( new Array( curr_edge[1], curr_edge[0] ) );
                        //console.log( `boundary_edges.length = ${boundary_edges.length}` );                    
                        boundary_edges_not_sorted.splice(i,1);
                        break;
                    }
                }
                
                if ( boundary_edges_len == boundary_edges.length ) { break;}
                boundary_edges_len = boundary_edges.length;
            }
        }
            
        return [ outer_tri, delaunay_tris, boundary_tris_to_remove, boundary_edges ];
    }
}