"use strict";

import { Vec2 } from './vec2.js';
import { Delaunay } from './delaunay.js';
import { Voronoi } from './voronoi.js';
import { ConvexHull } from './convexHull.js';

export
class GameObject {
    constructor( rigid_body, render_primitive ) {
        this.rigid_body = rigid_body;
        this.render_primitive = render_primitive;   
        this.request_destroy = false; 
    }
    
    update( dt ) {
        
        this.rigid_body.update( dt );
                
        // update pose - both for rigid body, as well as for render_primitive
        this.render_primitive.setPosition( this.rigid_body.pos_vec2.x, this.rigid_body.pos_vec2.y );
        this.render_primitive.setRotation( this.rigid_body.angle_rad );
        
        this.rigid_body.postUpdate();
    }
    
    onCollide() {}
    
    setPos( pos_vec2 ) {
        this.rigid_body.setPos( pos_vec2 );
    }
    translateBy( translation_delta_vec2 ) {
        this.rigid_body.translateBy( translation_delta_vec2 );
    }
    applyLinearVelocity( delta_linear_vel_vec2 ) {
        this.rigid_body.applyLinearVelocity( delta_linear_vel_vec2 );        
    }
    
    setAngle( angle_rad ) {
        this.rigid_body.setAngle( angle_rad );
    }
    rotateBy( delta_angle_rad ) {
        this.rigid_body.rotateBy( delta_angle_rad );
    }
    applyAngularVelocity( delta_angle_vel_rad ) {
        this.rigid_body.applyAngularVelocity( delta_angle_vel_rad );
    }

}

export
class GameObject_Breakable extends GameObject {
    constructor( rigid_body, render_primitive ) {
        super( rigid_body, render_primitive );
        this.shattered = false;
        this.create_game_object_callback = undefined;
    }
    
    static shardCreateEventName() { return "createShards"; }
    
    onCollide() {
        super.onCollide();
        
        if ( this.shattered == true ) { return; }
        this.shattered = true; // shatter only once!
        
        let output_voronoi_cells_array2 = [];
        
        // let delaunay_in = [ 
        //         [ 300.0, 300.0 ],  // p1
        //         [ 450.0, 300.0 ],  // p2
        //         [ 430.0, 450.0 ],  // p3
        //         [ 230.0, 300.0 ],  // p4
        //         [ 470.0, 290.0 ],  // p5
        //         [ 320.0, 170.0 ],  // p6
        //         [ 440.0, 230.0 ],  // p7
        //         [ 340.0, 290.0 ],  // p8
        //         [ 180.0, 280.0 ],  // p9
        //     ];
        
        let delaunay_in = [];
        
        this.rigid_body.world_space_points_ccw_vec2.forEach( (pos_vec2) => {
            delaunay_in.push( pos_vec2.toArray() );
        } );
        
        //let [ outer_tri, delaunay_tris, boundary_delaunay_tris, boundary_edges ] = Delaunay.calculate( this.rigid_body.world_space_points_ccw_vec2 );
        let [ outer_tri, delaunay_tris, boundary_delaunay_tris, boundary_edges ] = Delaunay.calculate( delaunay_in );
        
        let voronoi_convex_polygons = Voronoi.calculateVoronoiCellsAsPolygons( delaunay_tris );
        
        // ---------------
        
        // let delaunay_tri_vis = delaunay_tris;
        // const remove_boundary_tris = true;
        // if ( remove_boundary_tris ) {
        //     const delaunay_inner_tris = Delaunay.delaunayTrisWithoutBoundTris( delaunay_tris, outer_tri, boundary_edges );
        //     delaunay_tri_vis = delaunay_inner_tris;
        // }

        let subject_poly = [];
        subject_poly.push( boundary_edges[0][0] );
        for ( let i = 0; i < boundary_edges.length; i++ ) {
            subject_poly.push( boundary_edges[i][1] );
        }        
        subject_poly = ConvexHull.makeHull( subject_poly ); // ensure that boundary is convex, so that shards are convex polygons as well!!!
    
        voronoi_convex_polygons.forEach( (polygon) => {
            // let voronoi_convex_polygon_coords = [];
            // convert separate edges in boundary_edges into polyline
            
            let clipped_polygon = Voronoi.clip( subject_poly, polygon );
            if ( clipped_polygon.length >= 3 ) {
                //     clipped_polygon.forEach( (vertex) => {
                //         voronoi_convex_polygon_coords.push( vertex[ 0 ] );
                //         voronoi_convex_polygon_coords.push( vertex[ 1 ] );
                //     } );
                //     voronoi_convex_polygons_plot.push( voronoi_convex_polygon_coords );
                output_voronoi_cells_array2.push( clipped_polygon );
            }
            
        } );            

        //this.create_game_object_callback.call( output_voronoi_cells_array2 );
        //this.create_game_object_callback( output_voronoi_cells_array2 );
        // const create_shards_event = new CustomEvent( GameObject_Breakable.shardCreateEventName(), { cells_array2: output_voronoi_cells_array2 } );
        // create_shards_event.dispatchEvent()
       
        // TODO: add each voronoi polygon to scene!
        let caller = this.create_game_object_callback.caller;
        let func = this.create_game_object_callback.func;
        //func.call( caller, [ [1,2], [3,4], [5,6] ] );
        
        //const mass = 0.0;
        const mass = 10.0;
        //const mass = 0.5;
        const restitution = 0.02;
        const friction = 0.4;
        //const this_center_vec2 = this.rigid_body.pos_vec2;
        
        let cell_idx = 0;
        console.log( `there are ${output_voronoi_cells_array2.length} voronoi cells:` )
        output_voronoi_cells_array2.forEach( (voronoi_cell) => {
            console.log( `------ voronoi cell '${cell_idx}' with ${voronoi_cell.length} vertices` ); cell_idx++;
            
            let com_vec2 = new Vec2( 0.0, 0.0 );
            voronoi_cell.forEach( (vertex) => {
                console.log( `( ${vertex[0]} | ${vertex[1]} )` );
                com_vec2.add( Vec2.fromArray(vertex) );
            } );
            const num_verts = voronoi_cell.length;
            const scale = 1.0 / num_verts;
            com_vec2.mulScalar( scale );

            voronoi_cell.forEach( (vertex) => {
                const rel_x = vertex[ 0 ] - com_vec2.x;
                const rel_y = vertex[ 1 ] - com_vec2.y;
                vertex[ 0 ] = com_vec2.x + 0.925 * rel_x;
                vertex[ 1 ] = com_vec2.y + 0.925 * rel_y;
            } );
            
            
            // //com_vec2.add( Vec2.sub( com_vec2, this_center_vec2 ).mulScalar( 1.05 ) );
            // let diff_vec2 = Vec2.sub( com_vec2, this_center_vec2 );
            // //diff_vec2.x = 0.0;
            // //com_vec2.add( diff_vec2.mulScalar( 1.2 ) );
            // com_vec2.x += diff_vec2.x * 1.01;
            // com_vec2.y += diff_vec2.y * 1.3;
            
            func.call( caller, voronoi_cell, com_vec2, mass, restitution, friction );
        } );
        
        //func.call( caller, output_voronoi_cells_array2, mass );
        
        
        //!!! 
        this.destroy_self();
        
    }
    
    destroy_self() { 
        console.log( `game object destroyed itself!` );
        this.destroy_self = true; 
    }
}

// export {GameObject, GameObject_Breakable };