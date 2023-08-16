"use strict";

class CollisionInfo {
    
    static none = new CollisionInfo();
    
    constructor() {
        this.depth = 0.0;
        this.normal = new Vec2(0, 0);
        this.start_collision_pt = new Vec2(0, 0);
        this.end_collision_pt = new Vec2(0, 0);
        this.outside = true;
    }
}

class SupportPointInfo {
    constructor( found_support_pt, query_dir_vec2, support_pt_idx, support_depth, on_polygon_a_b ) {
        this.found_support_pt = found_support_pt;
        this.query_dir_vec2 = query_dir_vec2;
        this.support_pt_idx = support_pt_idx;
        this.support_depth = support_depth;
        this.on_polygon_a_b = on_polygon_a_b;
    }
    
    //{ found_support_pt: false, query_dir_vec2: query_dir_vec2, support_pt_idx: -1, support_depth: -1.0 }
}

class Collisions {
    
    static collideShapes( shape_A, shape_B ) {
        
        if ( shape_A.shape_type == ShapeType.circle && shape_B.shape_type == ShapeType.circle ) {
            return this.collideCircleCircle( shape_A, shape_B );
        } else {
            //return this.collideCircleCircle( shape_A, shape_B );
            
            // broad phase first => circ-circ
            const broad_phase_collision_detected = this.collideBoundingCircle_BroadPhase( shape_A, shape_B );
            
            // if broad-phase collision detection didn't detect a collision, the enclosed shapes can't collide either!
            if (!broad_phase_collision_detected) { return [false, false, CollisionInfo.none]; }
            //else { return [ true, new CollisionInfo() ]; } // TODO: DEBUG for now!!!

            // did we pass broad-phase collision detection? well then, enter narrow-phase collision detection!
            if (shape_A.shape_type == ShapeType.circle && shape_B.shape_type == ShapeType.polygon) {
                return this.collideCirclePolygon(shape_A, shape_B);
            } else if (shape_A.shape_type == ShapeType.polygon && shape_B.shape_type == ShapeType.circle) {
                return this.collidePolygonCircle(shape_A, shape_B);
            } else if (shape_A.shape_type == ShapeType.polygon && shape_B.shape_type == ShapeType.polygon) {
                return this.collidePolygonPolygon(shape_A, shape_B);
            }
        }
    }
    
    static collideCircleCircle( circ_A, circ_B ) {
        // console.log( `collide circ-circ` );

        const radius_A = circ_A.getBoundRadius();
        const radius_B = circ_B.getBoundRadius();
        
        const circ_A_center_vec2 = Vec2.fromArray( circ_A.getBoundingCircleWS()[0] );
        const circ_B_center_vec2 = Vec2.fromArray( circ_B.getBoundingCircleWS()[0] );
        const dir_center_A_to_B_vec2 = Vec2.sub( circ_B_center_vec2, circ_A_center_vec2 ); // definition: point from A to B
        
        //const dist_A_B = Vec2.dist( circ_A_center_vec2, circ_B_center_vec2 );
        const dist_A_B = dir_center_A_to_B_vec2.len();
        //const dist_A_B = Math.max( MathUtil.f32_Eps(), dir_center_A_to_B_vec2.len() );
        
        const radius_sum = radius_A + radius_B;
        const collision_depth = radius_sum - dist_A_B;

        //if ( dist_A_B > radius_A + radius_B ) {
        //if ( 0.0 > collision_depth ) {
        if ( collision_depth < 0.0 ) {
            return [ false, false, CollisionInfo.none ]; // narrow-phase collision, broad-phase collision, collision info
        }
        
        let dist_squared = dir_center_A_to_B_vec2.lenSquared();
        if ( MathUtil.isApproxEqual( dist_squared, 0.0 ) ) { // circles are centered at same pos
            let collisionInfo = new CollisionInfo();
            collisionInfo.depth = radius_sum; //Math.max( radius_A, radius_B );
            collisionInfo.normal = new Vec2( 0.0, -1.0 ); // upward
            //collisionInfo.normal = new Vec2( 0.0, 1.0 ); // upward (?)
            collisionInfo.start_collision_pt = Vec2.add( circ_A_center_vec2, Vec2.mulScalar( collisionInfo.normal, -Math.max( radius_A, radius_B ) ) );
            collisionInfo.end_collision_pt   = Vec2.add( collisionInfo.start_collision_pt, Vec2.mulScalar( collisionInfo.normal, collisionInfo.depth ) );
            
            return [ true, true, collisionInfo ];
        }
        
        //const collision_normal = Vec2.normalize( dir_center_A_to_B_vec2 );
        // if ( dist_squared < MathUtil.f32_Eps() ) {
        //     dist_squared = MathUtil.f32_Eps();
        // }
        //const collision_normal = dir_center_A_to_B_vec2.scale( 1.0 / Math.sqrt(dist_squared) );
        const collision_normal = dir_center_A_to_B_vec2.scale( -1.0 / Math.sqrt(dist_squared) );
        
        
        let collisionInfo = new CollisionInfo();
        collisionInfo.depth = collision_depth;
        
        collisionInfo.normal = collision_normal;
        // collisionInfo.start = Vec2.add( circ_B_center_vec2, Vec2.mulScalar( collision_normal, -radius_B ) );
        // collisionInfo.end   = Vec2.add( circ_A_center_vec2, Vec2.mulScalar( collision_normal, radius_A ) );;
        collisionInfo.start_collision_pt = Vec2.add( circ_B_center_vec2, Vec2.mulScalar( collision_normal, radius_B ) );
        collisionInfo.end_collision_pt   = Vec2.add( circ_A_center_vec2, Vec2.mulScalar( collision_normal, -radius_A ) );;
        collisionInfo.outside = true;
                
        return [ true, true, collisionInfo ];
    }

    static collideBoundingCircle_BroadPhase( shape_A, shape_B ) { // only check for collision, don't calculate any collision info
        //console.log( `collide circ-circ broad phase` );
        
        const radius_A = shape_A.getBoundRadius();
        const radius_B = shape_B.getBoundRadius();
        const dist_A_B = Vec2.dist( Vec2.fromArray( shape_A.getBoundingCircleWS()[0] ), Vec2.fromArray( shape_B.getBoundingCircleWS()[0] ) );
        return ( dist_A_B < radius_A + radius_B );
    }
    
    static collideCirclePolygon( circ_A, poly_B, flip ) {
        //console.log( `collide circ-poly` );
        
        // determine closest edge to circle center
        const circ_bounding_info = circ_A.getBoundingCircleWS();
        const circ_center_WS_vec2 = Vec2.fromArray( circ_bounding_info[0] );
        const circ_radius = circ_bounding_info[1];
    
        let intersection_dist = MathUtil.f32_LargestPosVal();
        let intersection_t = undefined;
        let intersection_edge_s = undefined;
        let intersection_edge_e = undefined;
        for ( let i = 0; i < poly_B.world_space_points_ccw_vec2.length; i++ ) {
            const j = ( ( i + 1 ) % poly_B.world_space_points_ccw_vec2.length);
            const line_segment_start_vec2 = poly_B.world_space_points_ccw_vec2[i];
            const line_segment_end_vec2 = poly_B.world_space_points_ccw_vec2[j];
            
            const curr_dist_info = MathUtil.distPointToLineSegment( circ_center_WS_vec2, line_segment_start_vec2, line_segment_end_vec2 );
            const curr_dist = curr_dist_info.dist;
            const t = curr_dist_info.t; // t=0 => edge start pt, t=1 => edge end pt, t "between 0 and 1" => pt along the edge
            
            //min_dist = Math.min( min_dist, curr_dist );
            if ( curr_dist < intersection_dist ) {
                intersection_dist = curr_dist;
                intersection_edge_s = line_segment_start_vec2;
                intersection_edge_e = line_segment_end_vec2;
                //console.log( `t = ${t}` );
                intersection_t = t;
            }
        }
        
        const closest_line_seg_dir_vec2 = Vec2.sub( intersection_edge_e, intersection_edge_s );
        const closest_intersection_pt = Vec2.add( intersection_edge_s, Vec2.mulScalar( closest_line_seg_dir_vec2, intersection_t ) );
        
        /*
        // check inside / outside case
        const intersection_edge_dir = Vec2.sub( intersection_edge_e, intersection_edge_s );
        const edge_normal = new Vec2( intersection_edge_dir.y, -intersection_edge_dir.x );
        //const edge_normal = new Vec2( -intersection_edge_dir.y, intersection_edge_dir.x );
        let outside = true;
        if ( Vec2.dot( Vec2.sub( circ_center_WS_vec2, intersection_edge_s ), edge_normal ) < 0.0 ) {
            outside = false;
        }
        */
        let outside = false;
        for ( let i = 0; i < poly_B.world_space_points_ccw_vec2.length; i++ ) {
            const j = ( ( i + 1 ) % poly_B.world_space_points_ccw_vec2.length);
            const line_segment_start_vec2 = poly_B.world_space_points_ccw_vec2[i];
            const line_segment_end_vec2 = poly_B.world_space_points_ccw_vec2[j];

            const edge_dir = Vec2.sub( line_segment_end_vec2, line_segment_start_vec2 );
            const edge_normal = new Vec2( edge_dir.y, -edge_dir.x );
            
            if ( Vec2.dot( Vec2.sub( circ_center_WS_vec2, line_segment_start_vec2 ), edge_normal ) > 0.0 ) {
                outside = true;
                break;
            }
        }
                
        if ( intersection_dist < circ_radius ) {
            // TODO - CollisionInfo !!!
            let collision_info = new CollisionInfo();
            collision_info.depth = circ_radius - intersection_dist;

            let dir_vec2;
            if ( flip != undefined || flip == true ) {
                dir_vec2 = Vec2.sub( closest_intersection_pt, circ_center_WS_vec2 );
            } else {
                dir_vec2 = Vec2.sub( circ_center_WS_vec2, closest_intersection_pt );
            }
            collision_info.normal = dir_vec2.normalize();
            //collision_info.normal = dir_vec2.normalizeSafe();

            collision_info.start_collision_pt = closest_intersection_pt; // ???
            collision_info.end_collision_pt = Vec2.add( closest_intersection_pt, Vec2.mulScalar( collision_info.normal, -collision_info.depth ) );
            collision_info.outside = outside;
                
            return [ true, true, collision_info ];
        }
        
        return [ false, true, CollisionInfo.none ];
    }

    static collidePolygonCircle( poly_A, circ_B ) {
        const flip = true;
        return this.collideCirclePolygon( circ_B, poly_A, flip );
    }

    static getSupportPoint( query_dir_vec2, query_pt_vec2, points_vec2, on_polygon_a_b ) {
        let max_dist = MathUtil.f32_LargestNegVal();
        let support_pt_idx = -1;
        for ( let i = 0; i < points_vec2.length; i++ ) {
            const curr_dist = Vec2.dot( query_dir_vec2, Vec2.sub( points_vec2[i], query_pt_vec2 ) );
            //const curr_dist = Vec2.dot( query_dir_vec2, Vec2.sub( query_pt_vec2, points_vec2[i] ) );
            if ( curr_dist > max_dist ) {
                max_dist = curr_dist;
                support_pt_idx = i;
            }
        }
        
        //if ( max_dist < 0.0 ) { // no support pt found
        if ( max_dist <= 0.0 ) { // no support pt found
            //return [ false, -1, -1.0 ];
            //return { found_support_pt: false, query_dir_vec2: query_dir_vec2, support_pt_idx: -1, support_depth: -1.0 };
            
            const found_support_pt = false;
            //const query_dir_vec2 = query_dir_vec2;
            const support_pt_idx = -1; 
            const support_depth = -1.0;
            return new SupportPointInfo( found_support_pt, query_dir_vec2, support_pt_idx, support_depth, on_polygon_a_b );
        }
        //return [ true, support_pt_idx, max_dist ];
        //return { found_support_pt: true, query_dir_vec2: query_dir_vec2, support_pt_idx: support_pt_idx, support_depth: max_dist };
        //return new SupportPointInfo( { found_support_pt: true, query_dir_vec2: query_dir_vec2, support_pt_idx: support_pt_idx, support_depth: max_dist } );
        
        const found_support_pt = true;
        //const query_dir_vec2 = query_dir_vec2;
        //const support_pt_idx = support_pt_idx;
        const support_depth = max_dist;
        return new SupportPointInfo( found_support_pt, query_dir_vec2, support_pt_idx, support_depth, on_polygon_a_b );
    }

    
    static collidePolygonPolygon( poly_A, poly_B ) {
        //console.log( `collide poly-poly` );
        
        // for poly_A - test poly_B
        //let support_pt_info_min_penetration_depth = [ undefined, undefined, MathUtil.f32_LargestPosVal() ];
        //let support_pt_info_min_penetration_depth = /*new SupportPointInfo(*/{ found_support_pt: false, query_dir_vec2: undefined, support_pt_idx: -1, support_depth: -1.0 /*)*/};
        let support_pt_info_min_penetration_depth = new SupportPointInfo( false, undefined, -1, MathUtil.f32_LargestPosVal() );
        
        for ( let i = 0; i < poly_A.world_space_edge_normals_ccw_vec2.length; i++ ) {
            //const query_dir_vec2 = poly_A.world_space_edge_normals_ccw_vec2[i];
            const normal_dir_vec2 = poly_A.world_space_edge_normals_ccw_vec2[i];
            const query_dir_vec2 = Vec2.mulScalar( normal_dir_vec2, -1.0 );
            
            const query_pt_vec2 = poly_A.world_space_points_ccw_vec2[i];
            
            const support_pt_info = this.getSupportPoint( query_dir_vec2, query_pt_vec2, poly_B.world_space_points_ccw_vec2, "polygonB" );
            
            //if ( support_pt_info[ 0 ] == false ) {
            if ( support_pt_info.found_support_pt == false ) {
                return [ false, true, CollisionInfo.none ];
            }
            
            //if ( support_pt_info[2] < support_pt_info_min_penetration_depth[2] ) {
            if ( support_pt_info.support_depth < support_pt_info_min_penetration_depth.support_depth ) {
                //support_pt_info_min_penetration_depth = [ support_pt_info[0], support_pt_info[1], support_pt_info[2] ];
                support_pt_info_min_penetration_depth = support_pt_info;
            }
        }

        // for poly_B - test poly_A        
        for ( let i = 0; i < poly_B.world_space_edge_normals_ccw_vec2.length; i++ ) {
            const normal_dir_vec2 = poly_B.world_space_edge_normals_ccw_vec2[i];
            const query_dir_vec2 = Vec2.mulScalar( normal_dir_vec2, -1.0 );
            
            const query_pt_vec2 = poly_B.world_space_points_ccw_vec2[i];
            
            const support_pt_info = this.getSupportPoint( query_dir_vec2, query_pt_vec2, poly_A.world_space_points_ccw_vec2, "polygonA" );
            
            // if ( support_pt_info[ 0 ] == false ) {
            if ( support_pt_info.found_support_pt == false ) {
                return [ false, true, CollisionInfo.none ];
            }

            // if ( support_pt_info[2] < support_pt_info_min_penetration_depth[2] ) {
            //     support_pt_info_min_penetration_depth = [ support_pt_info[0], support_pt_info[1], support_pt_info[2] ];
            // }
            if ( support_pt_info.support_depth < support_pt_info_min_penetration_depth.support_depth ) {
                support_pt_info_min_penetration_depth = support_pt_info;
            }
        }

        // now we have the axis of least penetration => see "Building a Physics Engine" p.57 on how to use this info for penetration resolving
        // array contains: true, support_pt_idx, max_dist
        // TODO: support_pt_info_min_penetration_depth
        
        const support_pt_idx = support_pt_info_min_penetration_depth.support_pt_idx;
        
        let support_pt = undefined;
        if ( support_pt_info_min_penetration_depth.on_polygon_a_b == "polygonA" ) {
            support_pt = poly_A.world_space_points_ccw_vec2[support_pt_idx];
        } else if ( support_pt_info_min_penetration_depth.on_polygon_a_b == "polygonB" ) {
            //support_pt_info_min_penetration_depth.normal.mulScalar( -1.0 );
            support_pt_info_min_penetration_depth.query_dir_vec2.mulScalar( -1.0 );
            
            support_pt = poly_B.world_space_points_ccw_vec2[support_pt_idx];
        }
        
        let new_collision_info = new CollisionInfo();
        new_collision_info.depth = support_pt_info_min_penetration_depth.support_depth;
        //new_collision_info.normal = Vec2.mulScalar( support_pt_info_min_penetration_depth.query_dir_vec2, -1.0 );
        new_collision_info.normal = Vec2.mulScalar( support_pt_info_min_penetration_depth.query_dir_vec2, -1.0 );
        new_collision_info.start_collision_pt = support_pt;
        new_collision_info.end_collision_pt = Vec2.add( support_pt, Vec2.mulScalar( new_collision_info.normal, new_collision_info.depth ) );
        new_collision_info.outside = true;
        
        //return [ false, CollisionInfo.none ];
        return [ true, true, new_collision_info ];
    }
}
