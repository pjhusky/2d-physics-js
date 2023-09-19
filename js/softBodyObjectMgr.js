"use strict";

class SoftBodyObjectMgr {
    constructor( app, gfx_utils ) {
        this.app = app;
        
        this.softBodyContainer = new PIXI.Container();
			
        //const sim_grid_dim = {w:1000.0, h:1000.0};
        this.softBodyContainer.position.set(0, 0);
        this.softBodyContainer.width  = app.screen.width;
        this.softBodyContainer.height = app.screen.height;
        this.softBodyContainer.pivot.set( 0.0, 0.0 );
        // this.softBodyContainer.filterArea = this.app.renderer.screen;
        
        this.soft_body_objects = [];
        this.soft_body_poly_outline_indices = [];
        
        this.soft_body_gos = [];
        
        this.gfx_utils = new GfxUtils( app ) || gfx_utils;
    }
    
    getSoftBodySpringMassSystemAtIdx( idx ) {
        return this.soft_body_objects[ idx ].spring_mass_system;
    }

    getSoftBodyPolygonOutlineVec2AtIdx( idx ) {
        return this.soft_body_objects[ idx ].polygon_outline_vec2;
    }

    getSoftBodyPolygonOutlineIndicesAtIdx( idx ) {
        return this.soft_body_poly_outline_indices[ idx ];
    }
    
    getSoftBodyContainer() {
        return this.softBodyContainer;
    }
    
    makeBall( ball_center, ball_radius, num_ball_outer_subdivs, mass_point_radius, point_mass_opt = 1.0 ) {
        let springMassSystem = new SoftBodySolver.SoftBodySolver();
        let polygon_outline_vec2 = [];
        let polygon_outline_indices = [];
        
        //const point_mass = point_mass || 1.0;
        const point_mass = point_mass_opt
        
        const sbo_idx = this.soft_body_objects.length;
        
        { // make ball
            const angleStep = Math.PI * 2.0 / num_ball_outer_subdivs;
            //const outlinedCircleRT = true;
            
            

            // Textures initally have widht=height=1, regardless of the image size
            // after the first render pass this is fixed
            // https://github.com/pixijs/pixijs/issues/1517
            //let tex = PIXI.Texture.from( '../assets/spheremap-mountains.jpg' );		
            const with_outline = true;
            
            let tex = this.gfx_utils.getCircleRenderTexture( mass_point_radius, with_outline );
            
            for ( let i = 0; i < num_ball_outer_subdivs + 1; i++ ) {
                
                let softBodyParticle = new SoftBodySolver.MassPoint( point_mass, tex);
                softBodyParticle.blendMode = PIXI.BLEND_MODES.NORMAL;
                softBodyParticle.tint = parseInt(Math.floor(Math.random() * 16777215).toString(16), 16);
                //softBodyParticle.tint = "#AA3333";
                
                softBodyParticle.anchor.set(0.5);

                let angle = i * angleStep;
                
                if ( i == 0 ) {
                    softBodyParticle.position.x = ball_center.x;
                    softBodyParticle.position.y = ball_center.y;
                } else {
                    softBodyParticle.position.x = ball_center.x + Math.cos( angle ) * ball_radius;
                    softBodyParticle.position.y = ball_center.y + Math.sin( angle ) * ball_radius;
                    
                    polygon_outline_vec2.push( new Vec2( softBodyParticle.position.x, softBodyParticle.position.y ) );
                    polygon_outline_indices.push( i );
                }
                
                softBodyParticle.vel.x = 0.0;
                softBodyParticle.vel.y = 0.0;
                

                softBodyParticle.speed = 0.0; //1 + random() * 1.2;
                
                this.softBodyContainer.addChild( softBodyParticle );                
                // add particle to spring-mass system solver
                springMassSystem.addParticle( softBodyParticle );
            }

            // springs among all masspoints
            //for ( let i = 0; i < num_ball_outer_subdivs; i++ ) {
            // for ( let i = 1; i < num_ball_outer_subdivs; i++ ) { // skip center at 0
            //     // insert links into 
            //     for ( let j = i + 1; j < num_ball_outer_subdivs; j++ ) {
            //         //springMassSystem.addLink( i, j % num_ball_outer_subdivs );
                    
            //         let idx2 = j % num_ball_outer_subdivs;
            //         if ( idx2 == 0 ) { idx2 = 1;}
            //         springMassSystem.addLink( i, idx2 );
            //     }
            // }
            
            // springs arranged in triangle-fan topology toward a new mass-point center
            for ( let i = 1; i < num_ball_outer_subdivs + 1; i++ ) {
                const idx0 = i;// % (num_ball_outer_subdivs + 1);
                //const idx1 = (i+1) % (num_ball_outer_subdivs + 1);
                let idx1 = i + 1;
                if ( idx1 > num_ball_outer_subdivs) {
                    idx1 = 1;
                }
                springMassSystem.addLink( 0, idx0 );
                springMassSystem.addLink( idx0, idx1 );
            }
        }

        this.soft_body_objects.push( { spring_mass_system: springMassSystem, polygon_outline_vec2: polygon_outline_vec2 } );
        this.soft_body_poly_outline_indices.push( polygon_outline_indices );
        
        //return springMassSystem;
        return sbo_idx;
    }
    
    makePlank( plank_center, plank_dim, sub_divs, mass_point_radius, point_mass_opt = 1.0 ) {
        // plank_dim.w is subdivided into sub_divs.x steps
        // plank_dim.h is subdivided into sub_divs.y steps

        let springMassSystem = new SoftBodySolver.SoftBodySolver();
        let polygon_outline_vec2 = [];
        let polygon_outline_indices = [];
        
        const point_mass = point_mass_opt;

        { // make ball
            const step_x = plank_dim.w / ( sub_divs.x + 0 );
            const step_y = plank_dim.h / ( sub_divs.y + 0 );
        
            

            const with_outline = true;
            
            let tex = this.gfx_utils.getCircleRenderTexture( mass_point_radius, with_outline );

            
            let y_idx = 0;
            for ( let y = 0; y <= plank_dim.h; y += step_y, y_idx++ ) {
                let x_idx = 0;
                for ( let x = 0; x <= plank_dim.w; x += step_x, x_idx++ ) {

                    let softBodyParticle = new SoftBodySolver.MassPoint( point_mass, tex);
                    softBodyParticle.blendMode = PIXI.BLEND_MODES.NORMAL;
                    softBodyParticle.tint = parseInt(Math.floor(Math.random() * 16777215).toString(16), 16);
                    //softBodyParticle.tint = "#AA3333";
                    
                    softBodyParticle.anchor.set(0.5);

                    softBodyParticle.position.x = plank_center.x + ( x - plank_dim.w * 0.5 );
                    softBodyParticle.position.y = plank_center.y + ( y - plank_dim.h * 0.5 );
                    
                    softBodyParticle.vel.x = 0.0;
                    softBodyParticle.vel.y = 0.0;                    
    
                    softBodyParticle.speed = 0.0; //1 + random() * 1.2;
                    
                    this.softBodyContainer.addChild( softBodyParticle );                
                    // add particle to spring-mass system solver
                    springMassSystem.addParticle( softBodyParticle );
                        
                    // springs form mesh with crossing diagonals in each 'cell' of r adjacent mass points
                    // unfortunately not the desired triangle-fan topology 
                    if ( x > 0 && y > 0 ) {
                        const idx_y0_x0 = /* com_first_point_offset_inc + */ ( ( ( y_idx - 1 ) * ( sub_divs.x + 1 ) ) + ( x_idx - 1 ) );
                        const idx_y1_x0 = /* com_first_point_offset_inc + */ ( ( ( y_idx - 0 ) * ( sub_divs.x + 1 ) ) + ( x_idx - 1 ) );
                        const idx_y0_x1 = /* com_first_point_offset_inc + */ ( ( ( y_idx - 1 ) * ( sub_divs.x + 1 ) ) + ( x_idx - 0 ) );
                        const idx_y1_x1 = /* com_first_point_offset_inc + */ ( ( ( y_idx - 0 ) * ( sub_divs.x + 1 ) ) + ( x_idx - 0 ) );
                        
                        // horizontal
                        springMassSystem.addLink( idx_y0_x0, idx_y0_x1 );
                        springMassSystem.addLink( idx_y1_x0, idx_y1_x1 );
                        
                        // diagonals
                        springMassSystem.addLink( idx_y0_x0, idx_y1_x1 );
                        springMassSystem.addLink( idx_y0_x1, idx_y1_x0 );
                        
                        // vertical
                        springMassSystem.addLink( idx_y0_x0, idx_y1_x0 );
                        springMassSystem.addLink( idx_y0_x1, idx_y1_x1 );                        
                    }
                    
                }
            }            
        }

        let particles = springMassSystem.getParticles();
        { // verical row left ==> skip "corner" points, as their are covered by the two horizontal rows already
            //console.log( `particles.length = ${particles.length}` )
            //console.log( `sub_divs = ${sub_divs.x} | ${sub_divs.y}` );
            let x_idx = 0;
            for (let y_idx = 1; y_idx <= sub_divs.y - 1; y_idx++) {
                const addr = y_idx * (sub_divs.x + 1) + x_idx;
                //console.log( `left outline addr = ${addr}` );
                polygon_outline_vec2.push(new Vec2(particles[addr].position.x, particles[addr].position.y));
                polygon_outline_indices.push( addr );
            }
        }
        { // horizontal lower row
            let y_idx = sub_divs.y + 0;
            for (let x_idx = 0; x_idx <= sub_divs.x + 0; x_idx++) {
                const addr = y_idx * (sub_divs.x + 1) + x_idx;
                polygon_outline_vec2.push(new Vec2(particles[addr].position.x, particles[addr].position.y));
                polygon_outline_indices.push( addr );
            }
        }
        { // verical row right ==> skip "corner" points, as their are covered by the two horizontal rows already
            let x_idx = sub_divs.x + 0;
            for (let y_idx = sub_divs.y - 1; y_idx >= 1; y_idx--) {
                const addr = y_idx * (sub_divs.x + 1) + x_idx;
                polygon_outline_vec2.push(new Vec2(particles[addr].position.x, particles[addr].position.y));
                polygon_outline_indices.push( addr );
            }
        }
        { // horizontal upper row
            let y_idx = 0;
            for (let x_idx = sub_divs.x + 0; x_idx >= 0; x_idx--) {
                const addr = y_idx * (sub_divs.x + 1) + x_idx;
                polygon_outline_vec2.push(new Vec2(particles[addr].position.x, particles[addr].position.y));
                polygon_outline_indices.push( addr );
            }
        }
        
        const sbo_idx = this.soft_body_objects.length;
        this.soft_body_objects.push( { spring_mass_system: springMassSystem, polygon_outline_vec2: polygon_outline_vec2 } );
        this.soft_body_poly_outline_indices.push( polygon_outline_indices );
        
        //return springMassSystem;
        return sbo_idx;
    }
    

    updateDriver ( fix_step, num_sub_steps ) {
        
        let sbo_idx = 0;
        this.soft_body_objects.forEach( (sbo) => {
            sbo.spring_mass_system.updateDriver( fix_step, num_sub_steps );
 
            //const num_pts = sbo.polygon_outline_vec2.length;
            let particles = sbo.spring_mass_system.getParticles();
             
            sbo.polygon_outline_vec2 = [];
             
            // if ( this.soft_body_shape_types[sbo_idx] == ShapeType.circle ) {
            //     for ( let i = 1; i < particles.length; i++ ) {
            //         let softBodyParticle = particles[i];
            //         sbo.polygon_outline_vec2.push( new Vec2( softBodyParticle.position.x, softBodyParticle.position.y ) );
            //     }
            // } else {
            // }
            
            this.soft_body_poly_outline_indices[sbo_idx].forEach( (idx) => {
                let softBodyParticle = particles[idx];
                sbo.polygon_outline_vec2.push( new Vec2( softBodyParticle.position.x, softBodyParticle.position.y ) );
            } );

            sbo_idx++;
        } );
    }

}