"use strict";

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
        
    onCollide() {
        super.onCollide();
        
        if ( this.shattered == true ) { return; }
        this.shattered = true; // shatter only once!
        
        /**
        let output_voronoi_cells_array2 = []
        
        let [ outer_tri, delaunay_tris, boundary_delaunay_tris, boundary_edges ] = Delaunay.calculate( this.rigid_body.world_space_points_ccw_vec2 );
        let voronoi_convex_polygons = Voronoi.calculateVoronoiCellsAsPolygons( delaunay_tris );
        let delaunay_tri_vis = delaunay_tris;
        const remove_boundary_tris = true;
        if ( remove_boundary_tris ) {
            const delaunay_inner_tris = Delaunay.delaunayTrisWithoutBoundTris( delaunay_tris, outer_tri, boundary_edges );
            delaunay_tri_vis = delaunay_inner_tris;
        }

        voronoi_convex_polygons.forEach( (polygon) => {
            // let voronoi_convex_polygon_coords = [];
            // convert separate edges in boundary_edges into polyline
            let subject_poly = [];
            subject_poly.push( boundary_edges[0][0] );
            for ( let i = 0; i < boundary_edges.length; i++ ) {
                subject_poly.push( boundary_edges[i][1] );
            }
            
            subject_poly = ConvexHull.makeHull( subject_poly ); // ensure that boundary is convex, so that shards are convex polygons as well!!!
            
            let clipped_polygon = Voronoi.clip( subject_poly, polygon );
            // if ( clipped_polygon.length >= 3 ) {
            //     clipped_polygon.forEach( (vertex) => {
            //         voronoi_convex_polygon_coords.push( vertex[ 0 ] );
            //         voronoi_convex_polygon_coords.push( vertex[ 1 ] );
            //     } );
            //     voronoi_convex_polygons_plot.push( voronoi_convex_polygon_coords );
            // }
            output_voronoi_cells_array2.push( clipped_polygon );
        } );            

        create_game_object_callback.call( output_voronoi_cells_array2 );
        **/
       
        // TODO: add each voronoi polygon to scene!
        
        this.destroy_self();
        
    }
    
    destroy_self() { this.destroy_self = true; }
}

// export {GameObject, GameObject_Breakable };