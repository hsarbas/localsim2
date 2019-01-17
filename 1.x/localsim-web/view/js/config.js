function round(number, decimals){
    //return +(Math.round(number + "e+" + decimals) + "e-" + decimals);
    //return Math.ceil(number);
    let dec = Math.pow(10, decimals);
    return Math.round(number * dec) / dec;
}

const PX2M_DEFAULT = 0.18;

const DESIRED_VELOCITY = 23.33;
const MINIMUM_HEADWAY = 1.0;
const SAFE_TIME_HEADWAY = 1.6;

const ACCELERATION_THRESHOLD = 0.3;
const POLITENESS_FACTOR = 0.554;
const SAFE_BRAKING_DECELERATION = 4.0;


class ConfigObject extends Signal{
    constructor(px2m_factor=null, desired_vel=null, min_headway=null, safe_time_headway=null, acc_threshold=null,
                p_factor=null, b_safe=null){
        super();

        this.events = ['change'];
        this.dp = 2;
        if(px2m_factor!=null){
            this._px2m_factor = round(px2m_factor, this.dp);
        }
        else{
            this._px2m_factor = PX2M_DEFAULT;
        }

        // car-following and lane-changing constants
        if(desired_vel != null){
            this.desired_velocity = desired_vel;
        }
        else{
            this.desired_velocity = DESIRED_VELOCITY;
        }

        if(min_headway != null){
            this.minimum_headway = min_headway;
        }
        else{
            this.minimum_headway = MINIMUM_HEADWAY;
        }

        if(safe_time_headway != null){
            this.safe_time_headway = safe_time_headway;
        }
        else{
            this.safe_time_headway = SAFE_TIME_HEADWAY;
        }

        if(acc_threshold != null){
            this.acceleration_threshold = acc_threshold;
        }
        else{
            this.acceleration_threshold = ACCELERATION_THRESHOLD;
        }

        if(p_factor != null){
            this.politeness_factor = p_factor;
        }
        else{
            this.politeness_factor = POLITENESS_FACTOR;
        }

        if(b_safe != null){
            this.safe_braking_deceleration = b_safe;
        }
        else {
            this.safe_braking_deceleration = SAFE_BRAKING_DECELERATION;
        }
    }

    to_m(px){
        return Math.round(round(px*this._px2m_factor, this.dp));
    }

    to_px(m){
        return Math.round(round(m / this._px2m_factor, 2));
    }

    get_px2m_factor(){
        return round(this._px2m_factor, this.dp);
    }

    set_px2m_factor(f){
        f = round(f, this.dp);

        if(parseInt(1.0/f) < 1){
            throw 'Pixel2MeterRatioTooSmall';
        }
        else if(f != this._px2m_factor){
            let old = this._px2m_factor;
            this._px2m_factor = f;
            this.fire('change', new Map().set('old_px2m', old));
        }
    }

    get_m2px_factor(){
        return round(1.0/this.get_px2m_factor(), this.dp);
    }

    reset(value=null){
        if(value != null){
            this._px2m_factor = round(value, this.dp);
        }
        else{
            this._px2m_factor = PX2M_DEFAULT;
        }
    }

    deconstruct(){
        const cls = "localsim.config.ConfigObject";
        const args = [];
        const kwargs = {"px2m_factor": this.get_px2m_factor(),
            "desired_velocity": this.desired_velocity,
            "minimum_headway": this.minimum_headway,
            "safe_time_headway": this.safe_time_headway,
            "acceleration_threshold": this.acceleration_threshold,
            "politeness_factor": this.politeness_factor,
            "safe_braking_deceleration": this.safe_braking_deceleration};
        return [cls, args, kwargs]
    }

}