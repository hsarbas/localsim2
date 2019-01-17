const DYNAMIC_ROUTING = "dynamic";
const STATIC_ROUTING = "static";

class Scene{
    constructor(){
        this.iroads = [];
        this.uroads = [];
        this.landmarks = [];
        this.surveyors = new Map();
        this.conflict_zones = new Map();
        this.controls = new Map();
        this.routes = new Map();
        this.dispatcher = new Map();
        this.routing_mode = STATIC_ROUTING;

        this._road_entries_index = new Map();
        this._road_exits_index = new Map();
        this._road_label_index = new Map();
    }

    entries(road){
        let ret = [];

        if(!this._road_entries_index.has(road)){
            this._road_entries_index.set(road, []);
        }

        for(let entry of this._road_entries_index.get(road)){
            ret.push(entry);
        }
        return ret;
    }

    add_dispatcher(dispatcher){
        this.dispatcher.set(dispatcher.uroad, dispatcher);
    }

    exits(road){
        let ret = [];

        if(!this._road_exits_index.has(road)){
            this._road_exits_index.set(road, []);
        }

        for(let exit of this._road_exits_index.get(road)){
            ret.push(exit);
        }

        return ret;
    }

    get_exit_roads(road){
        let exits = this.exits(road);
        let exit_roads = [];

        if(exits.length == 0){
            if(!exit_roads.includes(road)){
                exit_roads.push(road);
                explored.push(road.label);
            }
            return exit_roads;
        }

        else{
            for(let exit of exits){
                if(!explored.includes(exit.label)){
                    explored.push(exit.label);
                    let exit_roads_ = this.get_exit_roads(exit);
                    for(let exit_road of exit_roads_){
                        if(!exit_roads.includes(exit_road)){
                            exit_roads.push(exit_road);
                        }
                    }
                }
            }
            return exit_roads;
        }
    }

    // get_exit_roads(road){
    //     let exit_roads = [];
    //     this._collect_exit_roads(road, exit_roads, this);
    //     return exit_roads;
    // }
    //
    // _collect_exit_roads(road, exit_roads, scene){
    //     console.log('pass');
    //     if(road){
    //         let exits = scene.exits(road);
    //         if(exits.length == 0){
    //             if(!exit_roads.includes(road)){
    //                 exit_roads.push(road);
    //             }
    //         }
    //         for(let exit of exits){
    //             setTimeout(scene._collect_exit_roads, 0, exit, exit_roads, scene);
    //         }
    //     }
    // }


    add_road(road){
        let keys = [];
        if(road instanceof Uninterrupted_Road){
            if(!this.uroads.includes(road)){
                this.uroads.push(road);
                this.routes.set(road, null);
                this.dispatcher.set(road, new Entry(road, null));

                this._road_label_index.forEach(function(value, key){
                    keys.push(key);
                });

                if(keys.includes(road.label)){
                    throw Error('road label exists');
                }
                this._road_label_index.set(road.label, road);
            }
        }

        else if(road instanceof Interrupted_Road){
            if(!this.iroads.includes(road)){
                this.iroads.push(road);

                this._road_entries_index.set(road, [road.src_road]);
                this._road_exits_index.set(road, [road.dst_road]);

                if(!this._road_entries_index.has(road.dst_road)){
                    this._road_entries_index.set(road.dst_road, []);
                }
                this._road_entries_index.get(road.dst_road).push(road);

                if(!this._road_exits_index.has(road.src_road)){
                    this._road_exits_index.set(road.src_road, []);
                }
                this._road_exits_index.get(road.src_road).push(road);

                this.routes.set(road.src_road, new Route(road.src_road, this.exits(road.src_road)));
                if(this.dispatcher.has(road.dst_road)){
                    this.dispatcher.delete(road.dst_road);
                }

                this._road_label_index.forEach(function(value, key){
                    keys.push(key);
                });

                if(keys.includes(road.label)){
                    throw Error('road label exists');
                }
                this._road_label_index.set(road.label, road);
            }
        }
    }

    remove_road(road){
        if(this.controls.has(road)){
            for(let ctr=this.controls.get(road).length-1; ctr>=0; ctr--){
                let control = this.controls.get(road)[ctr];
                this.remove_control(control);
            }
            this.controls.delete(road);
        }

        if(this.surveyors.has(road)){
            for(let ctr=this.surveyors.get(road).length-1; ctr>=0; ctr--){
                let survey = this.surveyors.get(road)[ctr];
                this.remove_surveyor(survey);
            }
            this.surveyors.delete(road);
        }

        if(this.conflict_zones.has(road)){
            for(let ctr=this.conflict_zones.get(road).length-1; ctr>=0; ctr--){
                let conf_zone = this.conflict_zones.get(road)[ctr];
                this.remove_conflict_zone(conf_zone);
            }
            this.conflict_zones.delete(road);
        }


        road.segments.get_split_nodes().forEach(function(split_node){
            split_node.destroy();
        });

        if(road instanceof Uninterrupted_Road){
            if(this.uroads.includes(road)){

                let entries = this.entries(road);
                for(let entry of entries){
                    this.remove_road(entry);
                }

                let exits = this.exits(road);
                for(let exit of exits){
                    this.remove_road(exit);
                }

                if(this.dispatcher.has(road)){
                    this.dispatcher.delete(road);
                }

                this.uroads.splice(this.uroads.indexOf(road), 1);
                this._road_entries_index.delete(road);
                this._road_exits_index.delete(road);
                this._road_label_index.delete(road.label);

                road.src.destroy();
                road.dst.destroy();
                road.destroy();
            }
        }

        else if(road instanceof Interrupted_Road){
            if(this.iroads.includes(road)){

                this.iroads.splice(this.iroads.indexOf(road), 1);
                this._road_entries_index.delete(road);
                this._road_exits_index.delete(road);
                this._road_entries_index.get(road.dst_road).splice(this._road_entries_index.get(road.dst_road).indexOf(road), 1);
                this._road_exits_index.get(road.src_road).splice(this._road_exits_index.get(road.src_road).indexOf(road), 1);
                this._road_label_index.delete(road.label);

                if(this.exits(road.src_road).length > 0){
                    this.routes.set(road.src_road, new Route(road.src_road, this.exits(road.src_road)));
                }
                else{
                    this.routes.set(road.src_road, null);
                }

                this.dispatcher.set(road.dst_road, new Entry(road.dst_road, null));

                road.destroy();
            }
        }
    }

    edit_uroad(road, values){
        if(this.uroads.includes(road)){
            let label = values[0];
            let lanes = values[1];
            let lane_width = values[2];
            let limit = values[3];
            let priority = values[4];
            let type_ = values[5];
            let z_axis = values[6];
            let length = values[7];

            if(lanes < road.get_lanes()){
                let controls = null;
                if(this.controls.get(road)){
                    controls = this.controls.get(road);
                }
                else{
                    controls = [];
                }

                for(let ctr=0; ctr<controls.length; ctr++){
                    let c = controls[ctr];
                    if(c.lane + 1 > lanes){
                        this.controls.get(road)[ctr] = null;
                        c.destroy();
                    }
                }

                function exists(val){
                    return val != null;
                }

                if(this.controls.get(road)){
                    let temp = this.controls.get(road).filter(exists);
                    this.controls.get(road).length = 0;
                    for(let ctr=0; ctr<temp.length; ctr++){
                        this.controls.get(road).push(temp[ctr]);
                    }
                }


                for(let ctr=0; ctr<this.entries(road).length; ctr++){
                    let e = this.entries(road)[ctr];
                    if(this.controls.get(e)){
                        controls = this.controls.get(e);
                    }
                    else{
                        controls = [];
                    }
                    for(let ctr2=0; ctr2<controls.length; ctr2++){
                        let c = controls[ctr2];
                        if(c.lane + 1 > lanes){
                            //this.controls.get(e).splice(this.controls.get(e).indexOf(c), 1);
                            this.controls.get(e)[ctr2] = null;
                            c.destroy();
                        }
                    }

                    if(this.controls.get(e)){
                        let temp = this.controls.get(e).filter(exists);
                        this.controls.get(e).length = 0;
                        for(let ctr2=0; ctr2<temp.length; ctr2++){
                            this.controls.get(e).push(temp[ctr2]);
                        }
                    }
                }


                for(let ctr=0; ctr<this.exits(road).length; ctr++){
                    let e = this.exits(road)[ctr];

                    if(this.controls.get(e)){
                        controls = this.controls.get(e);
                    }
                    else{
                        controls = [];
                    }
                    for(let ctr2=0; ctr2<controls.length; ctr2++){
                        let c = controls[ctr2];
                        if(c.lane + 1 > lanes){
                            this.controls.get(e)[ctr2] = null;
                            c.destroy();
                        }
                    }
                    if(this.controls.get(e)){
                        let temp = this.controls.get(e).filter(exists);
                        this.controls.get(e).length = 0;
                        for(let ctr2=0; ctr2<temp.length; ctr2++){
                            this.controls.get(e).push(temp[ctr2]);
                        }
                    }
                }
            }

            let v = this._road_label_index.get(road.label);
            this._road_label_index.delete(road.label);

            road.label = label;
            road.speed_limit = limit;
            road.set_lanes(lanes);
            road.set_lane_width(lane_width);
            road.set_priority(priority);
            road.type = type_;
            road.z_axis = z_axis;
            road.set_length(length);

            this._road_label_index.set(label, v);
        }
    }

    edit_iroad(road, ilist, olist, values){
        if(this.iroads.includes(road)){
            let label = values[0];
            let lane_width = values[1];
            let limit = values[2];
            let priority = values[3];
            let type_ = values[4];
            let z_axis = values[5];
            let splits = values[6];

            if(this.controls.has(road)){
                this.controls.get(road).forEach(function(control){
                    control.destroy();
                });
                this.controls.delete(road);
            }

            let v = this._road_label_index.get(road.label);
            this._road_label_index.delete(road.label);

            road.label = label;
            road.set_lane_width(lane_width);
            road.speed_limit = limit;
            road.set_lanes(ilist.length);
            road.edit_lane_match(ilist, olist);
            road.set_priority(priority);
            road.type = type_;
            road.z_axis = z_axis;

            for(let old_split of road.segments.get_split_nodes()){
                road.merge(old_split);
            }

            for(let split of splits){
                let segments = road.segments.segments;
                road.split(segments[segments.length-1], split.x, split.y);
            }


            this._road_label_index.set(label, v);
            this.routes.set(road.src_road, new Route(road.src_road, this.exits(road.src_road)));
        }
    }

    road_names(){
        let ret = [];

        this._road_label_index.forEach(function(value, key){
            ret.push(key);
        });

        return ret;
    }

    get_road_by_label(label){
        return this._road_label_index.get(label);
    }

    entry_roads(){
        let ret = [];

        for(let ctr=0; ctr<this.uroads.length; ctr++){
            let road = this.uroads[ctr];

            if(this.entries(road).length == 0){
                ret.push(road);
            }
        }
        return ret;
    }

    exit_roads(){
        let ret = [];
        for(let ctr=0; ctr<this.uroads.length; ctr++){
            let road = this.uroads[ctr];
            if(this.exits(road).length == 0){
                ret.push(road);
            }
        }
        return ret;
    }

    routable_roads(){
        let ret = [];
        for(let road of this.iroads){
            if(!ret.includes(road.src_road)){
                ret.push(road.src_road);
            }
        }
        return ret;
    }

    add_control(control){
        if(!this.controls.has(control.road)){
            this.controls.set(control.road, []);
        }
        if(!this.controls.get(control.road).includes(control)){
            this.controls.get(control.road).push(control);
        }
    }

    remove_control(control){
        let keys = this.controls.keys();
        for(let ctr=0; ctr<this.controls.size; ctr++){
            let road = keys.next().value;
            if(this.controls.get(road).includes(control)){
                this.controls.get(road).splice(this.controls.get(road).indexOf(control), 1);
                break;
            }
        }
        control.destroy();
    }

    add_route(route){
        this.routes.set(route.uroad, route);
    }

    serialize(filename){
        // TODO: check routes
        let a = serial_encode(this.collect_nodes(), "node:", true);
        let b = serial_encode(this.uroads, "uroad:", true);
        let c = serial_encode(this.iroads, "iroad:", true);
        let d = map_multi_encode(this.controls, "control:", true);
        let e = map_single_encode(this.dispatcher, "dispatcher:", true);
        //let f = dummy_encode("route:", true);
        let f = map_single_encode(this.routes, "route:", true);
        let g = serial_encode(this.landmarks, "landmark:", true);
        let h = map_multi_encode(this.surveyors, "surveyor:", true);
        let i = dummy_encode("data:", true);
        let j = serial_encode([config], "config:", true);
        //let k = dummy_encode("conflict_zone:", true);
        let k = map_multi_encode(this.conflict_zones, "conflict_zone:", true);

        save(filename, a + b + c + d + e + f + g + h + i + j + k);
        purge_cache();
    }

    serial_play(duration, animated, rand_string){
        let a = serial_encode(this.collect_nodes(), "node:", true);
        let b = serial_encode(this.uroads, "uroad:", true);
        let c = serial_encode(this.iroads, "iroad:", true);
        let d = map_multi_encode(this.controls, "control:", true);
        let e = map_single_encode(this.dispatcher, "dispatcher:", true);
        //let f = dummy_encode("route:", true);
        let f = map_single_encode(this.routes, "route:", true);
        let g = serial_encode(this.landmarks, "landmark:", true);
        let h = map_multi_encode(this.surveyors, "surveyor:", true);
        let i = dummy_encode("data:", true);
        let j = serial_encode([config],"config:", true);
        //let k = dummy_encode("conflict_zone:", true);
        let k = map_multi_encode(this.conflict_zones, "conflict_zone:", true);

        stream(duration, this.routing_mode, rand_string, animated, a + b + c + d + e + f + g + h + i + j + k);
        purge_cache()
    }

    collect_nodes(){
        let nodes = [];
        for(let road of this.uroads){
            nodes.push(road.src);
            nodes.push(road.dst);
            for(let s of road.segments.get_split_nodes()){
                //console.log(s);
                nodes.push(s);
            }
        }
        for(let road of this.iroads){
            for(let s of road.segments.get_split_nodes()){
                nodes.push(s);
            }
        }
        return nodes;
    }

    remove_route(route){

    }

    add_surveyor(survey){
        if(!this.surveyors.has(survey.road)){
            this.surveyors.set(survey.road, []);
        }
        if(!this.surveyors.get(survey.road).includes(survey)){
            this.surveyors.get(survey.road).push(survey);
        }
    }

    remove_surveyor(survey){
        let keys = this.surveyors.keys();
        for(let ctr=0; ctr<this.surveyors.size; ctr++){
            let road = keys.next().value;
            if(this.surveyors.get(road).includes(survey)){
                this.surveyors.get(road).splice(this.surveyors.get(road).indexOf(survey), 1);
                break;
            }
        }
        survey.destroy();
    }

    add_conflict_zone(conflict_zone){
        if(!this.conflict_zones.has(conflict_zone.road)){
            this.conflict_zones.set(conflict_zone.road, []);
        }

        if(!this.conflict_zones.get(conflict_zone.road).includes(conflict_zone)){
            this.conflict_zones.get(conflict_zone.road).push(conflict_zone);
        }
    }

    remove_conflict_zone(conflict_zone){
        let key_iter = this.conflict_zones.keys();
        let keys = [];
        for(let ctr=0; ctr<this.conflict_zones.size; ctr++){
            keys.push(key_iter.next().value);
        }
        let conf_ids = null;
        for(let ctr=0; ctr<keys.length; ctr++){
            let road = keys[ctr];
            if(this.conflict_zones.get(road).includes(conflict_zone)){
                conf_ids = conflict_zone.conflict_group;
                this.conflict_zones.get(road).splice(this.conflict_zones.get(road).indexOf(conflict_zone), 1);
                break;
            }
        }

        for(let ctr=0; ctr<keys.length; ctr++){
            let road = keys[ctr];
            for(let ctr2=0; ctr2<this.conflict_zones.get(road).length; ctr2++){
                let zone = this.conflict_zones.get(road)[ctr2];
                let id_ = null;  //TODO: see python codes
                if(id_){
                    zone.conflict_group.splice(zone.conflict_group.indexOf(id_[0]), 1)
                }
            }
        }

        conflict_zone.destroy();
    }

    get_conf_zone_by_id(id_){
        let marker = false;
        let zone = null;
        let key_iter = this.conflict_zones.keys();
        let keys = [];
        for(let ctr=0; ctr<this.conflict_zones.size; ctr++){
            keys.push(key_iter.next().value);
        }

        for(let ctr=0; ctr<keys.length; ctr++) {
            let road = keys[ctr];
            for(let ctr2=0; ctr2<this.conflict_zones.get(road).length; ctr2++) {
                zone = this.conflict_zones.get(road)[ctr2];
                if(zone.id == id_){
                    marker = true;
                    break;
                }
            }
            if(marker){
                break;
            }
        }
        return zone;
    }

    add_landmark(landmark){
        if(!this.landmarks.includes(landmark)){
            this.landmarks.push(landmark);
        }
    }

    remove_landmark(landmark){
        if(this.landmarks.includes(landmark)){
            this.landmarks.splice(this.landmarks.indexOf(landmark), 1);
        }
        landmark.destroy();
    }

    activate_collectors(zones){

        for(let z of this.surveyors){
            z.active = false;
        }

        for(let zone of zones){
            zone.active = true;
        }
    }

    locate_global(road, pos, lane){
        let x0 = null, y0 = null, xt = null, yt = null;
        let d = null, t_road = null, ret = null, ex = null, ey = null, rx0 = null, ry0 = null, rxt = null, ryt = null, xn = null, yn = null;
        if(road instanceof Interrupted_Road){
            let in_key_iter = road.in_matrix.keys();
            let in_side = [];
            for(let ctr=0; ctr<road.in_matrix.size; ctr++){
                in_side.push(in_key_iter.next().value);
            }

            let out_val_iter = road.out_matrix.values();
            let out_side = [];
            for(let ctr=0; ctr<road.out_matrix.size; ctr++){
                out_side.push(out_val_iter.next().value);
            }

            for(let ctr=0; ctr<road.segments.segments.length; ctr++){
                var segment = road.segments.segments[ctr];
                if(segment.get_length() >= pos){
                    break;
                }
                pos -= segment.get_length();
            }
            x0 = segment.src.x;
            y0 = segment.src.y;
            xt = segment.dst.x;
            yt = segment.dst.y;

            if(segment == road.segments.segments[0]){
                d = (in_side[0] + in_side[in_side.length-1] + 1) / 2.0;
                t_road = road.src_road.segments.segments[road.src_road.segments.segments.length-1];
                ret = delta_pt_in_perp_line(t_road.src.x, t_road.src.y, t_road.dst.x, t_road.dst.y, road.src_road.width/2.0);
                ex = ret[0];
                ey = ret[1];
                rx0 = t_road.src.x - ex;
                ry0 = t_road.src.y - ey;
                rxt = t_road.dst.x - ex;
                ryt = t_road.dst.y - ey;
                ret = delta_pt_in_perp_line(rx0, ry0, rxt, ryt, d * road.src_road.get_lane_width());
                xn = ret[0];
                yn = ret[1];
                x0 = rxt + xn;
                y0 = ryt + yn;
            }

            if(segment == road.segments.segments[road.segments.segments.length-1]){
                d = (out_side[0] + out_side[out_side.length-1] + 1) / 2.0;
                t_road = road.dst_road.segments.segments[0];
                ret = delta_pt_in_perp_line(t_road.src.x, t_road.src.y, t_road.dst.x, t_road.dst.y, road.dst_road.width/2.0);
                ex = ret[0];
                ey = ret[1];
                rx0 = t_road.src.x - ex;
                ry0 = t_road.src.y - ey;
                rxt = t_road.dst.x - ex;
                ryt = t_road.dst.y - ey;
                ret = delta_pt_in_perp_line(rx0, ry0, rxt, ryt, d * road.dst_road.get_lane_width());
                xn = ret[0];
                yn = ret[1];
                xt = rx0 + xn;
                yt = ry0 + yn;
            }
        }
        else if(road instanceof Uninterrupted_Road){
            for(let ctr=0; ctr<road.segments.segments.length; ctr++){
                segment = road.segments.segments[ctr];
                if(segment.get_length() >= pos){
                    break;
                }
                pos -= segment.get_length();
            }
            x0 = segment.src.x;
            y0 = segment.src.y;
            xt = segment.dst.x;
            yt = segment.dst.y

        }

        ret = delta_pt_in_line(x0, y0, xt, yt, pos);
        let long_dx = ret[0];
        let long_dy = ret[1];


        ret = delta_pt_in_perp_line(x0, y0, xt, yt, road.width / 2.0);
        let edge_x = ret[0];
        let edge_y = ret[1];
        let ref_x0 = x0 - edge_x;
        let ref_y0 = y0 - edge_y;
        let ref_xt = xt - edge_x;
        let ref_yt = yt - edge_y;

        ret = delta_pt_in_perp_line(ref_x0, ref_y0, ref_xt, ref_yt, lane * road.get_lane_width());
        let lat_dx = ret[0];
        let lat_dy = ret[1];

        let x = ref_x0 + long_dx + lat_dx;
        let y = ref_y0 + long_dy + lat_dy;

        return [Math.round(x), Math.round(y)];
    }

    send(duration){
        let _nodes = serialize_nodes(this.uroads, "node", true);
        let _uroads = serialize_uroads(this.uroads, "uroad", true);
        let _iroads = serialize_iroads(this.iroads, "iroad", true);
        let data = _nodes + _uroads + _iroads;

//      TODO: stream? data here
//      TODO: Check implementations on post callbacks
        $.post("/", "RUN " + duration + "\r\n" + data)
    }

    valid_road_lengths(){
        for(let uroad of this.uroads){
            if(config.to_m(uroad.length) < 25.0){
                return [false, uroad.label];
            }
        }
        return [true, null];
    }
}
