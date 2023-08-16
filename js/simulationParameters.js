"use strict";

class SimulationParameters {
    
    static gravity() { return new Vec2( 0.0, 9.81 * 5.0 ); } // TODO: move to some global parameter file/class
    static linear_friction() { return 0.9875; }
    static angular_friction() { return 0.98; }

}