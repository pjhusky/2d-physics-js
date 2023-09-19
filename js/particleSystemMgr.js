"use strict";

class ParticleSystemType {
    static circles = new ParticleSystemType( 'Circles' );
    static metaballs = new ParticleSystemType( 'Metaballs' );
    
    constructor(name) {
        this.name = name;
    }
    
    toString() {
        return `ParticleSystemType.${this.name}`;
    }
}

class ParticleSystemWrapper {
    constructor( num_particles, particle_radius, sim_grid_dim, emission_rate = 8 ) {

		this.is_alive = true;
		this.is_full_screen_effect = false;
		this.sim_grid_dim = sim_grid_dim; // this.sim_grid_dim = {w:1024.0, h:1024.0};
        this.num_particles = num_particles;
        this.particle_radius = particle_radius;
		this.emission_rate = emission_rate;

		//this.fluidSolverCircleAreaConstraint = [];
		this.particleFluidSolver;
	
		this.particleContainer = new PIXI.Container();
		this.particleContainer.scale.set( 1.0, 1.0 );		
		this.particleContainer.width = this.sim_grid_dim.w;
		this.particleContainer.height = this.sim_grid_dim.h;        
		
		this.fluidParticleGravityX = 0.0;
		this.fluidParticleGravityY = 1200.0;

		this.fluidAsBlobs = false;
		this.outlinedCircleRT = null;
		this.useCircleOutline = true;
		this.fluid_tint_from_file = true;
		
		this.drawMetaballs = false;
		this.drawBackgroundMetaballs = false;
		this.useStickyGooLook = true;
		this.gaussTexture = null;
		this.metaballNormalsFilter = null;
		
		this.envMapTex = PIXI.Texture.from( '../assets/spheremap-mountains.jpg' ); 
		//this.sceneMapTex = PIXI.Texture.from( '../assets/glowing_blue.jpg' ); 
		this.sceneMapTex = PIXI.Texture.from( '../assets/mini_black.png' ); 
		this.maxGaussAccum = this.num_particles * 0.1; 
	
		
		this.activeFluidParticles = 0;
		
		this.fixedDt = 0.016;
		this.subSteps = 6;

	}

	initParticles() {
		
		let fluidParticleTints = (Math.random() < 0.5) ? ParticleColorsPcb.tints : ParticleColorsAtomic.tints;
		
		
		this.particleFluidSolver = new ParticleFluidSolver.FluidSolver( 
			this.sim_grid_dim.w, this.sim_grid_dim.h, 
			this.num_particles, this.particle_radius, this.fluidParticleGravityX, this.fluidParticleGravityY,
			this.fixedDt, this.subSteps,
			[] );

		this.activeFluidParticles = 0;
		for (let i = 0; i < this.num_particles; i++) {
			let fluidParticle = null;

			if ( this.fluidAsBlobs ) 
			{
				fluidParticle = new ParticleFluidSolver.FluidParticle(this.gaussTexture);
			
				//fluidParticle.scale.set( 0.1 + Math.random() * 0.3 );
				fluidParticle.scale.set( (0.1 + Math.random() * 0.3) * this.particle_radius * 0.08 );
				
				fluidParticle.blendMode = PIXI.BLEND_MODES.ADD;
				
				if ( this.useStickyGooLook ) {
					//fluidParticle.tint = parseInt(Math.floor(ParticleSystemMgr.random() * 16777215).toString(16), 16); // that STICKY gooey look :-)
					fluidParticle.tint = AppUtils.rgbToHex( ParticleSystemMgr.random() * 191 + 64, ParticleSystemMgr.random() * 191 + 64, ParticleSystemMgr.random() * 191 + 64 );
				} else {
					fluidParticle.tint = AppUtils.rgbToHex( 255, 255, 255 ); // CLEAN LOOK!!!
				}
				fluidParticle.anchor.set(0.5);				
			} 
			else 
			// {
			// 	// ouch - still "normal" particles
			// 	fluidParticle = new ParticleFluidSolver.FluidParticle(this.outlinedCircleRT);
			// 	fluidParticle.blendMode = PIXI.BLEND_MODES.NORMAL;
				
			// 	if ( this.useStickyGooLook ) {
			// 		//fluidParticle.tint = AppUtils.rgbToHex( ParticleSystemMgr.random() * 191 + 64, ParticleSystemMgr.random() * 191 + 64, ParticleSystemMgr.random() * 191 + 64 );
			// 		fluidParticle.tint = AppUtils.rgbToHex( ParticleSystemMgr.random() * 65 + 190, ParticleSystemMgr.random() * 85 + 170, ParticleSystemMgr.random() * 25 + 230 );
			// 	} else {
			// 		fluidParticle.tint = AppUtils.rgbToHex( 255, 255, 255 ); // CLEAN LOOK!!!
			// 	}
			// } 

			// else 
			{
				fluidParticle = new ParticleFluidSolver.FluidParticle(this.outlinedCircleRT);
				fluidParticle.blendMode = PIXI.BLEND_MODES.NORMAL;
				
				let addr = i;
				//if ( addr < fluidParticleTints.length ) {
				if ( this.fluid_tint_from_file ) {
					fluidParticle.tint = fluidParticleTints[addr];
				} else {
					// fluidParticle.tint = parseInt(Math.floor(ParticleSystemMgr.random() * 16777215).toString(16), 16);
					fluidParticle.tint = AppUtils.rgbToHex( 255, 255, 255 ); // CLEAN LOOK!!!
				}
			}
			
			fluidParticle.position.x = this.sim_grid_dim.w * ( 0.33 + ParticleSystemMgr.random() * 0.33 );
			fluidParticle.position.y = this.sim_grid_dim.h * ( 0.33 + ParticleSystemMgr.random() * 0.33 );

			fluidParticle.speed = 1 + ParticleSystemMgr.random() * 1.2;
			fluidParticle.lastPosX = fluidParticle.position.x;
			fluidParticle.lastPosY = fluidParticle.position.y; 

			fluidParticle.accelX = this.fluidParticleGravityX;
			fluidParticle.accelY = this.fluidParticleGravityY;
			
			this.particleFluidSolver.addParticle( fluidParticle );
		}

		this.particleFluidSolver.setActiveParticleCount( 0 );

		//return this;
	}	
	
	
	addParticleSystemConstraint( constraint ) {
        //this.particleFluidSolver.constraints.push( constraint );
		this.particleFluidSolver.addConstraint( constraint );
    }
    
	setCenterPos( pos ) {
		this.particleContainer.pivot.set( -pos.x, -pos.y );
		//this.particleContainer.position.set( pos.x, pos.y );
	}

	getCenterPos() {
		return new Vec2( this.particleContainer.pivot.x, this.particleContainer.pivot.y );
	}
}

class ParticleSystemMgr {

	static random = MathUtil.DeterministicRandom2().mulberry32;

    constructor( app ) {
		this.app = app;
		this.ps_container = new PIXI.Container();
        this.particle_systems = [];
		
		this.gfx_utils = new GfxUtils( this.app );
    }

	getParticleSystemAtIdx( idx ) { 
		return ( idx < this.particle_systems.length ) ? this.particle_systems[ idx ] : null; 
	}
	
	removeParticleSystemAtIdx( idx ) { 
		// attention, will mess up any indices stored to particle systems AFTER the just removed particle system!!!
		//this.particle_systems.splice(idx,1); 
		this.particle_systems[ idx ].is_alive = false;
	} 
	
    addParticleSystemConstraintTo( constraint, particle_sys_idx ) {
        //this.getParticleSystemAtIdx( particle_sys_idx ).particleFluidSolver.constraints.push( constraint );
		this.getParticleSystemAtIdx( particle_sys_idx ).addParticleSystemConstraint( constraint );
    }
	
	setCenterPos( pos, particle_sys_idx ) {
		this.getParticleSystemAtIdx( particle_sys_idx ).setCenterPos( pos );
	}
    
    addParticleSystem( particle_sys_type, num_particles, particle_radius, sim_grid_dim, emission_rate ) {
        
        let new_ps = new ParticleSystemWrapper( num_particles, particle_radius, sim_grid_dim, emission_rate );
        let particle_sys_idx = this.particle_systems.length;
        this.particle_systems.push( new_ps );
		
        if ( particle_sys_type == ParticleSystemType.circles ) {
            this.createCircleParticleSystem( new_ps, num_particles, particle_radius, sim_grid_dim );
        } else if ( particle_sys_type == ParticleSystemType.metaballs ) {
            this.createMetaballParticleSystem( new_ps, num_particles, particle_radius, sim_grid_dim );
        } else {
			console.error( `!!!!!!!! unrecognized particle-system type '${particle_sys_type}' !!!!!!!!!` );
		}
		
		new_ps.initParticles();
		
		//const scr_dim = { w: this.app.screen.width, h: this.app.screen.height };
		//const pos = { x: scr_dim.w * 0.5, y: scr_dim.h * 0.5 };
		//this.updateContainerSizes( scr_dim, pos )
        
		this.ps_container.addChild( new_ps.particleContainer );
        return particle_sys_idx;
    }
	
    createCircleParticleSystem( new_ps, num_particles, particle_radius, sim_grid_dim ) {
		
		new_ps.fluidAsBlobs = false;
		
		new_ps.fluid_tint_from_file = false;
		new_ps.useCircleOutline = true;

		new_ps.outlinedCircleRT = this.gfx_utils.getCircleRenderTexture( new_ps.particle_radius, new_ps.useCircleOutline );
		
		return new_ps;
    }
    
    createMetaballParticleSystem( new_ps, num_particles, particle_radius, sim_grid_dim ) {
        
		new_ps.fluidAsBlobs = true;
		
		new_ps.drawMetaballs = false;
		new_ps.drawBackgroundMetaballs = false;		
		new_ps.useStickyGooLook = false;

		const gaussDim = 256;
		//let gaussSpriteScale = 96.0 / gaussDim;
		//const gaussianDeviation = 0.2;
		//const gaussianDeviation = 0.4;
		const gaussianDeviation = particle_radius / 40.0;
		const gaussianHeight = 0.3;
		let [gaussContainer, gaussQuad, gaussTexture] = MyGauss.setupGauss( gaussDim, gaussianDeviation, gaussianHeight );
		//_ = gaussContainer; _ = gaussQuad;
		//this.test_sprite = PIXI.Sprite.from( '../assets/magnetic-field-2.png' );
		
		new_ps.gaussTexture = gaussTexture;
		
		new_ps.particleContainer.filterArea = this.app.renderer.screen;
		
		new_ps.metaballNormalsFilter = new PIXI.Filter( 
			FilterShaders.myVertexSrc,
			FilterShaders.metaballNormalsFilterFragmentSrc, 
			{   u_envMapTex: new_ps.envMapTex, 
				u_sceneMapTex: new_ps.sceneMapTex, 
				u_recipMaxGaussAccum: 1.0/new_ps.maxGaussAccum, 
				u_rDim: {x: 1.0/this.app.renderer.screen.width, y: 1.0/this.app.renderer.screen.height} } 
		);
	
		//container.filters = [this.metaballNormalsFilter];
		new_ps.particleContainer.filters = [new_ps.metaballNormalsFilter];
		
		return new_ps;
    }
    
    
	
	updateAllParticleSystems( dt_in_sec ) {
		
		for ( let i = 0; i < this.particle_systems.length; i++ ) {
			let ps = this.particle_systems[i];
			if ( !ps.is_alive ) { continue; }
			
			this.manageEmit( ps, dt_in_sec, ps.emission_rate );
			//console.log( `dt = ${dt}` );
			ps.particleFluidSolver.updateFluidDriver( dt_in_sec );
		}
	}
	
	recordingUpdate() {
		// if ( this.recording ) { // weird, but have to run this all the time in firefox for capture to work
		// 	const width = this.sceneMapTex.width;
		// 	const height = this.sceneMapTex.height;

		// 	this.sceneMapTexSprite.width  = width;
		// 	this.sceneMapTexSprite.height = height;
		// 	this.sceneMapTexSprite.anchor.set( 0.5 );
				
		// 	// Draw the circle to the RenderTexture
		// 	//if ( this.texRT == undefined ) {
		// 		this.texRT = PIXI.RenderTexture.create({
		// 			width,
		// 			height,
		// 			//multisample: MSAA_QUALITY.HIGH,
		// 			resolution: 1 //window.devicePixelRatio
		// 		});
		// 	//}
						
		// 	// With the existing renderer, render texture
		// 	// make sure to apply a transform Matrix
		// 	this.app.renderer.render(this.sceneMapTexSprite, {
		// 		renderTexture: this.texRT,
		// 		transform: new PIXI.Matrix(1, 0, 0, 1, width / 2, height / 2)
		// 	});
			
		// 	// Required for MSAA, WebGL 2 only
		// 	//this.app.renderer.framebuffer.blit();
			
		// 	this.sceneMapTexSprite.width = this.app.screen.width;
		// 	this.sceneMapTexSprite.height = this.app.screen.height;
		// 	this.sceneMapTexSprite.anchor.set( 0.0 );		
		// }		
	}

	manageEmit( ps, dt_in_sec, emission_rate ) {
// console.log( `this.app.screen.width = ${this.app.screen.width}` );
		// console.log( `this.app.screen.height = ${this.app.screen.height}` );
		
		//const dt_in_sec = 1.0 / 60.0;
		
		// emit new fluid particles    
		//const emissionRate = (this.fluid_tint_from_file) ? 8 : 6;
		//const emission_rate = 8;
		//const emissionRate = 1;
		for (let i = 0; i < emission_rate; i++) {
			const angleVal = dt_in_sec * 2.0 * 3.1415;
			const cosTime = Math.cos(angleVal) * 0.3 + 0.7;
			const sinTime = Math.sin(angleVal) * 0.3 + 0.7;

			//if ( activeFluidParticles < fluidParticles.length ) {
			if (ps.activeFluidParticles < ps.num_particles) {
				//let fluidParticle = fluidParticles[activeFluidParticles];
				//XXXYYYXXX let fluidParticle = particleFluidSolver.addNewParticleAtIdx( activeFluidParticles );
				let fluidParticle = ps.particleFluidSolver.getParticleAtIdx(ps.activeFluidParticles);

				//if ( this.fluid_tint_from_file ) 
				if ( !ps.fluidAsBlobs )
				{
					let offX = ps.activeFluidParticles % 13 - 6;
					offX *= 1.8 + 0.2 * ParticleSystemMgr.random();

					//fluidParticle.position.x = this.app.screen.width * 0.375 + offX * 1.25 * this.particle_radius;
					fluidParticle.position.x = ps.sim_grid_dim.w * 0.375 + offX * 1.25 * ps.particle_radius;

					let offY = ps.activeFluidParticles % 10;
					offY *= 0.8 + 0.2 * ParticleSystemMgr.random();
					let signX = -1.0;
					let randDir = -ParticleSystemMgr.random() * 0.4 + 0.6;
					const randDirX_tmp = randDir * signX * 0.8 * ps.particle_radius;
					const randDirY_tmp = 0.2; 

					let randDirX = +cosTime * randDirX_tmp + sinTime * randDirY_tmp;
					let randDirY = -sinTime * randDirX_tmp + cosTime * randDirY_tmp;

					fluidParticle.position.y = ps.sim_grid_dim.h * 0.225 + offY * ps.particle_radius;

					fluidParticle.position.x += randDirX * 2.0;
					fluidParticle.position.y += randDirY * 2.0;

					fluidParticle.lastPosX = fluidParticle.position.x + randDirX;
					fluidParticle.lastPosY = fluidParticle.position.y + randDirY; // + randDir * 0.5 * particle_radius; 

				}
				else /*if ( isMetaballFluidDemoMode )*/ {
					// let signX = ( activeFluidParticles % 3 ) - 1;
					// randDir = ParticleSystemMgr.random() * 0.5 - 0.25;
					// randDirX = randDir * 0.03 * signX;
					// randDirY = randDir * 0.02;
					// fluidParticle.position.x = app.screen.width * 0.5 + offX * particle_radius;
					// fluidParticle.position.y = app.screen.height * 0.25 + offY * particle_radius;
					let offX = ps.activeFluidParticles % 13 - 6;
					fluidParticle.position.x = app.screen.width / 2 + offX * 1.8 * ps.particle_radius;
					let offY = ps.activeFluidParticles % 10;
					let signX = ( ps.activeFluidParticles % 3 ) - 1;
					let randDir = ParticleSystemMgr.random() * 0.5 - 0.25;
					fluidParticle.speed = 0.0001;
					fluidParticle.position.y = app.screen.height / 4 + offY * 1.8 * ps.particle_radius;
					fluidParticle.lastPosX = fluidParticle.position.x + dt_in_sec * randDir * signX * 0.5 * ps.particle_radius;
					fluidParticle.lastPosY = fluidParticle.position.y + dt_in_sec * randDir * 0.5 * ps.particle_radius; 
				}
				fluidParticle.accelX = ps.fluidParticleGravityX;
				fluidParticle.accelY = ps.fluidParticleGravityY;

				ps.particleContainer.addChild(fluidParticle);
				
				
				ps.activeFluidParticles++;
				ps.particleFluidSolver.setActiveParticleCount(ps.activeFluidParticles);
				
				//console.log( `ps.activeFluidParticles = ${ps.activeFluidParticles}` )
				
			} else {
				break;
			}
		}		
	}
	
	updateContainerSizes( scr_dim, pos ) {
		if ( !this.is_full_screen_effect ) {
			return;
		}
		
		const aspect_ratio = scr_dim.w / scr_dim.h;
		
		this.particle_systems.forEach( (ps) => {
			
			let container_scale = { x: scr_dim.w / ps.sim_grid_dim.w, y: scr_dim.h / ps.sim_grid_dim.h };
			
			//console.log( `screen dim ${scr_dim.w} | ${scr_dim.h}` );
			if( scr_dim.w >= scr_dim.h ) {
				container_scale.x *= 1.0/aspect_ratio;
			} else {
				container_scale.y *= aspect_ratio;
			}		
			
			ps.particleContainer.scale = container_scale;				
			/**
			// ps.particleContainer.position.set( scr_dim.w * 0.5, scr_dim.h * 0.5 );
			// ps.particleContainer.pivot.set( 0.5 * ps.sim_grid_dim.w, 0.5 * ps.sim_grid_dim.h );
			ps.particleContainer.position.set( pos.x, pos.y );
			
			const pivot = { x: 0.5 * ps.sim_grid_dim.w, y: 0.5 * ps.sim_grid_dim.h };
			ps.particleContainer.pivot.set( pivot.x, pivot.y );
			**/
		} );
	}
}
	