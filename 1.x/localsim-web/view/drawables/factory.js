function create_node(x, y, dir){
    return new Node(x, y, dir);
}

function create_default_road_name(model){
    let ctr = 1;
    while(model._road_label_index.has('link-' + ctr.toString()) || model._road_label_index.has('t_link-' + ctr.toString())){
        ctr++;
    }
    return ctr;
}

function create_uroad(view, model, x_s, y_s, x_d, y_d){
    let length = distance([x_s - x_d, y_s - y_d]);

    app.create_uroad_popup.show(length, view, model, model.road_names(), null, x_s, y_s, x_d, y_d);
}

function create_iroad(view, model, src_road, dst_road){
    let length = distance([src_road.dst.x - dst_road.src.x, src_road.dst.y - dst_road.src.y]);

    app.create_iroad_popup.show(length, view, model, model.road_names(), null, src_road, dst_road);
}

function create_stop(view, x, y, road_) {
    let pos = point_to_dist(road_, x, y);
    let lane = point_to_lane(road_, x, y);
    return new Stop(road_, pos, lane);
}

function create_yield(view, x, y, road_){
    let pos = point_to_dist(road_, x, y);
    let lane = point_to_lane(road_, x, y);
    return new Yield(road_, pos, lane);
}

function create_stoplight(view, model, droad, x, y){
    app.create_stoplight_popup.show(view, model, droad, null, x, y);

}

function create_speed_limit(view, model, x0, y0, x1, y1, droad_) {
    app.create_limit_popup.show(view, model, x0, y0, x1, y1, null, droad_);

}

function create_stop_yield(view, model, x, y, road_){
    app.create_stop_yield_popup.show(view, model, x, y, road_);
}

function create_type_restriction(view, model, road_, x0, y0, x1, y1) {

    app.create_restrict_popup.show(view, model, road_, null, x0, y0, x1, y1);
}

function create_pt_stop(view, model, droad_, x0, y0, x1, y1) {
    app.create_ptstop_popup.show(view, model, droad_, null, x0, y0, x1, y1);

}

function create_survey_zone(view, model, droad_, x0, y0, x1, y1){

    let road_ = droad_.object;
    let lane = point_to_lane(road_, x0, y0);
    let first_pos = point_to_dist(road_, x0, y0);
    let next_pos = point_to_dist(road_, x1, y1);

    if(first_pos > next_pos){
        let temp = first_pos;
        first_pos = next_pos;
        next_pos = temp;
    }
    return new SurveyZone(road_, first_pos, lane, next_pos-first_pos, 'Unique');
    //app.create_survey_popup.show(view, model, droad_, x0, y0, x1, y1);
}

function create_conflict_area(view, model, droad_){
    app.create_conflict_popup.show(view, model, droad_);
}

function create_landmark(view, model, x, y){
    app.create_landmark_popup.show(view, model, x, y);
}

function create_dnode(gc, node){
    new DNode(gc, node);
}

function create_duroad(gc, uroad){
    new DURoad(gc, uroad);
    new DNode(gc, uroad.src);
    new DNode(gc, uroad.dst);
    uroad.segments.get_split_nodes().forEach(function(n){
        new DNode(gc, n);
    });
    gc.fix_order();

}

function create_diroad(gc, iroad){
    new DIRoad(gc, iroad);
    iroad.segments.get_split_nodes().forEach(function(n){
        new DNode(gc, n);
    });
    gc.fix_order();
}

function create_dstop(gc, stop){
    new DControlLine(gc, stop);
}

function create_dyield(gc, yield_){
    new DControlLine(gc, yield_);
}

function create_dspeed_limit(gc, control, segments){
    if(!segments || (segments.get('src') == null || segments.get('dst') == null)){
        let start_seg = dist_to_segment(control.road, control.pos);
        let end_seg = dist_to_segment(control.road, control.zone);
        segments = new Map();
        segments.set('src', start_seg);
        segments.set('dst', end_seg);
    }

    new DControlZone(gc, control, segments);
}

function create_dstoplight(gc, stoplight){
    new DControlLine(gc, stoplight);
}

function create_dtype_restriction(gc, control, segments){
    if(!segments || (segments.get('src') == null || segments.get('dst') == null)){
        let start_seg = dist_to_segment(control.road, control.pos);
        let end_seg = dist_to_segment(control.road, control.zone);
        segments = new Map();
        segments.set('src', start_seg);
        segments.set('dst', end_seg);
    }
    new DControlZone(gc, control, segments);
}

function create_dpt_stop(gc, control, segments){
    if(!segments || (segments.get('src') == null || segments.get('dst') == null)){
        let start_seg = dist_to_segment(control.road, control.pos);
        let end_seg = dist_to_segment(control.road, control.zone);
        segments = new Map();
        segments.set('src', start_seg);
        segments.set('dst', end_seg);
    }
    new DControlZone(gc, control, segments);
}

function create_dsurvey_zone(gc, control, segments){
    if(!segments || (segments.get('src') == null || segments.get('dst') == null)){
        let start_seg = dist_to_segment(control.road, control.pos);
        let end_seg = dist_to_segment(control.road, control.zone);
        segments = new Map();
        segments.set('src', start_seg);
        segments.set('dst', end_seg);
    }

    new DSurveyZone(gc, control, segments);
}

function create_dconflict_area(gc, conflict, segments){
    if(!segments || segments.length == 0){
        segments = [];
        let road_ = conflict.road;
        let marker = false;
        let first = dist_to_segment(conflict.road, conflict.pos);
        let last = dist_to_segment(conflict.road, conflict.exit);

        for(let segment of road_.segments.segments){
            if(segment == first){
                marker = true;
            }
            if(marker){
                segments.push(segment);
            }
            if(segment == last){
                break;
            }
        }
    }
    new DConflictArea(gc, conflict, segments);
}

function create_dlandmark(gc, landmark){
    new DLandmark(gc, landmark);
}

function edit_uroad(view, model, uroad){
    let label = uroad.label;
    let values = [label, uroad.get_lanes(), uroad.get_lane_width(), uroad.speed_limit, uroad.get_priority(), uroad.type, uroad.z_axis];
    let entries = model.entries(uroad);
    let exits = model.exits(uroad);

    let names = [];
    for(let ctr=0; ctr<model.road_names().length; ctr++){
        let name = model.road_names()[ctr];
        if(model.road_names()[ctr] != label){
            names.push(name);
        }
    }

    app.create_uroad_popup.show(uroad.length, view, model, names, uroad, null, null, null, null, values, [entries, exits], true);
}

function edit_iroad(view, model, iroad){
    let label = iroad.label;
    let key_iter = iroad.in_matrix.keys();
    let ilist = [];
    for(let ctr=0; ctr<iroad.in_matrix.size; ctr++){
        ilist.push(key_iter.next().value);
    }
    let val_iter = iroad.out_matrix.values();
    let olist = [];
    for(let ctr=0; ctr<iroad.out_matrix.size; ctr++){
        olist.push(val_iter.next().value);
    }

    let values = [label, iroad.get_lane_width(), iroad.speed_limit, iroad.get_priority(), iroad.type, iroad.z_axis,
        iroad.segments.get_split_nodes().length];

    let names = [];
    for(let ctr=0; ctr<model.road_names().length; ctr++){
        let name = model.road_names()[ctr];
        if(model.road_names()[ctr] != label){
            names.push(name);
        }
    }

    app.create_iroad_popup.show(iroad.length, view, model, names, iroad, iroad.src_road, iroad.dst_road, values, true);
}

function edit_zone_control(view, model, control){
    if(control instanceof SpeedLimitZone){
        let speed = control.limit;
        app.create_limit_popup.show(view, model, null, null, null, null, control, null, speed, true);
    }
    else if(control instanceof TypeRestrictionZone){
        let bias = control.bias;
        let types = control.white_list;
        app.create_restrict_popup.show(view, model, null, control, null, null, null, null, bias, types, true);
    }
    else if(control instanceof BusTerminalZone){
        let name = control.label;
        let mean = control.mean;
        let std_dev = control.std_dev;
        app.create_ptstop_popup.show(view, model, null, control, null, null, null, null, name, mean, std_dev, true);
    }
}

function edit_line_control(view, model, control){
    if(control instanceof StopLight){
        let phase = control.phase;
        let state = control.get_init_state();

        app.create_stoplight_popup.show(view, model, null, control, null, null, phase, state[0], state[1], true);
    }
}

function match_conflict_area(view, model){
    app.match_conflict_popup.show(view, model);
}