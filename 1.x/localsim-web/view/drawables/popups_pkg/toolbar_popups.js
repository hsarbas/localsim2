class URoadPopup{
    constructor(){

    }

    show(length, view, model, names, uroad, x_s, y_s, x_d, y_d, values=null, routes=null, edit=false){
        this.uroad = uroad;
        this.length = config.to_m(length);
        this.view = view;
        this.model = model;
        this.names = names;
        this.x_s = x_s;
        this.y_s = y_s;
        this.x_d = x_d;
        this.y_d = y_d;
        this.value = null;

        this.routes = routes;
        this.edit = edit;

        this.modal = $('#create-uroad');
        this.label_entry = $('#uroad-label');
        this.lanes_entry = $('#uroad-lanes');
        this.width_entry = $('#uroad-width');
        this.limit_entry = $('#uroad-limit');
        this.priority_option = null;
        //this.type_option = $('#type');
        //this.z_axis_option = $('#uroad-gradient');
        this.length_entry = $('#uroad-length');
        this.uroad_entry = $('#uroad-entry');
        this.uroad_exit = $('#uroad-exit');


        if(values){
            this.label_entry.val(values[0]);
            this.lanes_entry.val(values[1]);

            let lane_width = config.to_m(values[2]);
            this.width_entry.val(lane_width);
            this.limit_entry.val(values[3]);

            if(values[4] == 'major'){
                document.getElementById('uroad-priority-major').checked = true;
            }
            else{
                document.getElementById('uroad-priority-minor').checked = true;
            }

            //this.type_option.val(values[5]);
            //this.z_axis_option.val(values[6]);
        }
        else{
            this.label_entry.val('link-' + create_default_road_name(this.model).toString());
            this.lanes_entry.val(DEFAULT_LANES);
            this.width_entry.val(DEFAULT_LANE_WIDTH);
            this.limit_entry.val(DEFAULT_SPEED_LIMIT);
            document.getElementById('uroad-priority-major').checked = true;
            //this.z_axis_option.val(0);
        }

        let entry = null;
        let exit_ = null;

        if(routes){
            entry = routes[0];
            exit_ = routes[1];
        }
        else{
            entry = [];
            exit_ = [];
        }

        for(let road of entry){
            let option = document.createElement('option');
            option.text = road.label;
            this.uroad_entry.append(option);
        }

        for(let road of exit_){
            let option = document.createElement('option');
            option.text = road.label;
            this.uroad_exit.append(option);
        }

        this.length_entry.val(this.length);
        this.modal.modal();
    }

    do_(){
        let label = this.label_entry.val();
        let lanes = Number(this.lanes_entry.val());
        let length = Number(this.length_entry.val());
        let width = Number(this.width_entry.val());
        let limit = Number(this.limit_entry.val());
        this.priority_option = $("input[type='radio'][name='uroad-priority']:checked");
        let priority = this.priority_option.val();
        let type_ = 0;
        let z_axis = 0;

        if(!label){
            alert(NAME_INPUT_ERROR);
            this.label_entry.focus();
        }
        else if(label && this.names.includes(label)){
            alert(NAME_EXISTS_ERROR);
            this.label_entry.focus();
        }
        else if(label && has_whitespace(label)){
            alert(NAME_SPACE_ERROR);
            this.label_entry.focus();
        }
        else if(lanes<=0 || !check_int(lanes)){
            alert(LANE_INPUT_INT_ERROR);
            this.lanes_entry.focus();
        }
        else if(width<=0 || !check_float(width)){
            alert(WiDTH_INPUT_FLOAT_ERROR);
            this.width_entry.focus();
        }
        else if(limit<=0 || !check_float(limit)){
            alert(LIMIT_INPUT_FLOAT_ERROR);
            this.limit_entry.focus();
        }
        else{
            this.value = [label, lanes, config.to_px(width), limit, priority, type_, z_axis, config.to_px(length)];
            this.modal.modal('hide');
        }

        if(this.value){
            if(this.edit){
                this.view.update_undo_state(this.model);
                this.model.edit_uroad(this.uroad, this.value);
            }
            else{
                let src_node = create_node(this.x_s, this.y_s, 'src');
                let dst_node = create_node(this.x_d, this.y_d, 'dst');

                let uroad = new Uninterrupted_Road(this.value[0], src_node, dst_node, this.value[1], this.value[2], this.value[3], this.value[4], this.value[5], this.value[6]);
                this.view.update_undo_state(this.model);
                this.model.add_road(uroad);
                create_duroad(this.view, uroad);
            }
        }
    }
}

class IRoadPopup{
    constructor(){
    }

    show(length, view, model, names, iroad, src, dst, values=null, edit=false){
        this.iroad = iroad;
        this.edit = edit;
        this.length = round(config.to_m(length), 1);
        this.view = view;
        this.model = model;
        this.names = names;
        this.src_road = src;
        this.dst_road = dst;
        this.value = null;

        this.modal = $('#create-iroad');
        this.label_entry = $('#iroad-label');
        this.width_entry = $('#iroad-width');
        this.limit_entry = $('#iroad-limit');
        this.splits_entry = $('#iroad-splits');
        this.priority_option = null;
        //this.type_option = $('#type');
        //this.z_axis_option = $('#iroad-gradient');
        this.length_entry = $('#iroad-length');
        this.in_list_option = $('#iroad-entry');
        this.out_list_option = $('#iroad-exit');

        let defaults = [];
        for(let ctr=1; ctr<=this.src_road.get_lanes(); ctr++){
            let option = document.createElement('option');
            option.value = ctr;
            option.innerHTML = ctr;
            this.in_list_option.append(option, ctr);
            defaults.push(ctr);
        }
        this.in_list_option.val(defaults);

        defaults = [];
        for(let ctr=1; ctr<=this.dst_road.get_lanes(); ctr++){
            let option = document.createElement('option');
            option.value = ctr;
            option.innerHTML = ctr;
            this.out_list_option.append(option, ctr);
            defaults.push(ctr);
        }

        this.out_list_option.val(defaults);

        if(this.edit){
            this.label_entry.val(values[0]);
            let lane_width = config.to_m(values[1]);
            this.width_entry.val(lane_width);
            this.limit_entry.val(values[2]);
            this.splits_entry.val(values[6]);

            if(values[3] == 'major'){
                document.getElementById('iroad-priority-major').checked = true;
            }
            else{
                document.getElementById('iroad-priority-minor').checked = true;
            }

            //this.z_axis_option.val(values[5]);

            let key_iter = iroad.in_matrix.keys();
            let in_list = [];
            for(let ctr=0; ctr<iroad.in_matrix.size; ctr++){
                in_list.push(key_iter.next().value + 1);
            }
            this.in_list_option.val(in_list);

            let val_iter = iroad.out_matrix.values();
            let out_list = [];
            for(let ctr=0; ctr<iroad.out_matrix.size; ctr++){
                out_list.push(val_iter.next().value + 1);
            }

            this.out_list_option.val(out_list);
        }
        else{
            this.label_entry.val('t_link-' + create_default_road_name(this.model).toString());
            this.width_entry.val(DEFAULT_LANE_WIDTH);
            this.limit_entry.val(DEFAULT_SPEED_LIMIT);
            this.splits_entry.val(DEFAULT_SPLITS);
            document.getElementById('iroad-priority-major').checked = true;
        }

        this.length_entry.text(String(this.length) + ' m');
        this.modal.modal();
    }

    do_(){
        let label = this.label_entry.val();
        let width = Number(this.width_entry.val());
        let limit = Number(this.limit_entry.val());
        let splits = Number(this.splits_entry.val());
        this.priority_option = $("input[type='radio'][name='iroad-priority']:checked");
        let priority = this.priority_option.val();
        let type_ = 0;
        let z_axis = 0;
        let split_nodes = [];
        let in_list = this.in_list_option.val() || [];
        let out_list = this.out_list_option.val() || [];

        if(!label){
            alert(NAME_INPUT_ERROR);
            this.label_entry.focus();
        }
        else if(label && this.names.includes(label)){
            alert(NAME_EXISTS_ERROR);
            this.label_entry.focus();
        }
        else if(label && has_whitespace(label)){
            alert(NAME_SPACE_ERROR);
            this.label_entry.focus();
        }
        else if(in_list.length <= 0 || out_list.length <= 0){
            alert(LANE_SELECTED_ERROR);
        }
        else if(in_list.length != out_list.length){
            alert(LANE_MISMATCH_ERROR);
        }
        else if(!this.valid_splits(splits)){
            alert(SPLITS_INPUT_ERROR);
        }
        else if(width<=0 || !check_float(width)){
            alert(WiDTH_INPUT_FLOAT_ERROR);
            this.width_entry.focus();
        }
        else if(limit<=0 || !check_float(limit)){
            alert(LIMIT_INPUT_FLOAT_ERROR);
            this.limit_entry.focus();
        }

        else{
            for(let ctr=0; ctr<in_list.length; ctr++){
                in_list[ctr] = parseInt(in_list[ctr]) - 1;
            }

            for(let ctr=0; ctr<out_list.length; ctr++){
                out_list[ctr] = parseInt(out_list[ctr]) - 1;
            }

            let src_road_last_seg = this.src_road.segments.segments[this.src_road.segments.segments.length-1];
            let dst_road_first_seg = this.dst_road.segments.segments[0];

            let x1 = src_road_last_seg.src.x;
            let y1 = src_road_last_seg.src.y;
            let x2 = src_road_last_seg.dst.x;
            let y2 = src_road_last_seg.dst.y;
            let x3 = dst_road_first_seg.src.x;
            let y3 = dst_road_first_seg.src.y;
            let x4 = dst_road_first_seg.dst.x;
            let y4 = dst_road_first_seg.dst.y;

            let ret = pt_intersect(x1, y1, x2, y2, x3, y3, x4, y4);

            let dist_src_road_last_seg = dist_to_pt(x2, y2, ret[0], ret[1]);
            let dist_dst_road_first_seg = dist_to_pt(x3, y3, ret[0], ret[1]);

            let ext_pt = null;
            let pt_in_perp_line_src = null;
            let pt_in_perp_line_dst = null;

            if(dist_src_road_last_seg > dist_dst_road_first_seg){
                ext_pt = pt_in_line(x2, y2, ret[0], ret[1], dist_dst_road_first_seg);
                pt_in_perp_line_src = pt_in_perp_line(x2, y2, ret[0], ret[1], ext_pt[0], ext_pt[1]);
                pt_in_perp_line_dst = pt_in_perp_line(ret[0], ret[1], x3, y3, x3, y3);

                x2 = ext_pt[0];
                y2 = ext_pt[1];
            }

            else{
                ext_pt = pt_in_line(x3, y3, ret[0], ret[1], dist_src_road_last_seg);
                pt_in_perp_line_src = pt_in_perp_line(x2, y2, ret[0], ret[1], x2, y2);
                pt_in_perp_line_dst = pt_in_perp_line(ret[0], ret[1], x3, y3, ext_pt[0], ext_pt[1]);

                x3 = ext_pt[0];
                y3 = ext_pt[1];
            }

            let center_pt = pt_intersect(x2, y2, pt_in_perp_line_src[0], pt_in_perp_line_src[1], x3, y3,
                pt_in_perp_line_dst[0], pt_in_perp_line_dst[1]);

            let radius = dist_to_pt(center_pt[0], center_pt[1], x2, y2);

            let src_vector = pt_to_vector(center_pt[0], center_pt[1], x2, y2);
            let dst_vector = pt_to_vector(center_pt[0], center_pt[1], x3, y3);

            let central_angle = get_central_angle(src_vector, dst_vector);
            let dir_theta = get_theta_dir(src_vector, dst_vector);

            let delta_theta = get_delta_theta(central_angle, Number(splits));
            let ref_theta = get_theta_ref(src_vector);
            let src_theta = get_theta_src(src_vector[0], ref_theta);

            for(let ctr=0; ctr<Number(splits); ctr++){
                let split = pt_in_arc(center_pt[0], center_pt[1], radius, src_theta);

                split_nodes.push({x:split[0], y:split[1]});
                if(dir_theta > 0){
                    src_theta += delta_theta;
                }
                else{
                    src_theta -= delta_theta;
                }
            }

            this.value = [label, config.to_px(width), limit, priority, type_, z_axis, split_nodes];
            this.modal.modal('hide');
        }

        if(this.value){
            if(this.edit){
                this.view.update_undo_state(this.model);
                this.model.edit_iroad(this.iroad, in_list, out_list, this.value);
                for(let s of this.iroad.segments.get_split_nodes()){
                    create_dnode(this.view, s);
                }
            }
            else{
                let iroad = new Interrupted_Road(this.value[0], this.src_road, this.dst_road, in_list, out_list,
                    in_list.length, this.value[1], this.value[2], this.value[3], this.value[4], this.value[5],
                    this.value[6]);
                this.view.update_undo_state(this.model);
                this.model.add_road(iroad);
                create_diroad(this.view, iroad);
            }
        }
    }

    valid_splits(splits){
        return check_int(splits) && Number(splits) >= 0 && Number(splits) <= 20;
    }
}

class StopYieldPopup{

    constructor(){
    }

    show(view, model, x, y, road_){
        this.view = view;
        this.model = model;
        this.x = x;
        this.y = y;
        this.road = road_;

        this.modal = $('#create-stop-yield');

        this.modal.modal();
    }

    do_(){
        let value = $("input[type='radio'][name='stop-yield-sign']:checked").val();

        if(value == 'stop'){
            let stop = create_stop(this.view, this.x, this.y, this.road);
            if(stop){
                this.view.update_undo_state(this.model);
                this.model.add_control(stop);
                create_dstop(this.view, stop);
            }
            this.modal.modal('hide');
        }

        else if(value == 'yield'){
            let yield_ = create_yield(this.view, this.x, this.y, this.road);
            if(yield_){
                this.view.update_undo_state(this.model);
                this.model.add_control(yield_);
                create_dyield(this.view, yield_);
            }
            this.modal.modal('hide');
        }

        else{
            alert(INVALID_STOP_YIELD_INPUT);
        }
    }
}

class SpeedLimitPopup{
    constructor(){
    }

    show(view, model, x0, y0, x1, y1, control, droad_, limit=null, edit=false){
        this.view = view;
        this.model = model;
        this.control = control;
        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
        this.droad_ = droad_;
        this.value = null;
        this.edit = edit;

        this.modal = $('#create-speed-limit');
        this.limit = $('#speed-limit-max');

        if(limit){
            this.limit.val(mps_to_kph(limit));
        }

        this.modal.modal();
    }

    do_(){
        let control = this.control;
        let droad_ = this.droad_;
        let limit = Number(this.limit.val());
        let road_ = null;
        if(this.edit){
            road_ = control.road;
        }
        else{
            road_ = droad_.object;
        }

        if(this.edit){
            if(limit>0 && check_float(limit)){
                this.value = kph_to_mps(limit);
                this.modal.modal('hide');
            }
            else{
                alert(NONNUMERIC_ERROR);
                this.limit.focus();
            }
            if(this.value){
                control.limit = this.value;
            }
        }
        else{
            let x0 = this.x0;
            let y0 = this.y0;
            let x1 = this.x1;
            let y1 = this.y1;

            let lane = point_to_lane(road_, x0, y0);
            if(0 <= lane && lane < road_.get_lanes()){
                let first_pos = point_to_dist(road_, x0, y0);
                let next_pos = point_to_dist(road_, x1, y1);

                if(first_pos > next_pos){
                    let temp = first_pos;
                    first_pos = next_pos;
                    next_pos = temp;
                }

                if(limit>0 && check_float(limit)){
                    this.value = kph_to_mps(limit);
                    this.modal.modal('hide');
                }
                else{
                    alert(NONNUMERIC_ERROR);
                    this.limit.focus();
                }

                if(this.value){
                    let speed_limit = new SpeedLimitZone(road_, first_pos, lane, next_pos-first_pos, this.value);
                    this.view.update_undo_state(this.model);
                    this.model.add_control(speed_limit);
                    let segments = new Map();
                    segments.set('src', droad_.get_segment(x0, y0));
                    segments.set('dst', droad_.get_segment(x1, y1));
                    create_dspeed_limit(this.view, speed_limit, segments);

                }
            }
        }

    }
}

class PTStopPopup{
    constructor(){

    }

    show(view, model, droad_, control, x0, y0, x1, y1, name='', mean=DEFAULT_MEAN, std_dev=DEFAULT_STD_DEV, edit=false){
        this.view = view;
        this.model = model;
        this.droad_ = droad_;
        this.control = control;
        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
        this.label = name;
        this.mean = mean;
        this.std_dev = std_dev;
        this.value = null;
        this.edit = edit;

        this.modal = $('#create-ptstop');
        this.label_entry = $('#ptstop-label');
        this.mean_entry = $('#ptstop-mean');
        this.std_dev_entry = $('#ptstop-std-dev');

        this.label_entry.val(name);
        this.mean_entry.val(mean);
        this.std_dev_entry.val(std_dev);

        this.modal.modal();
    }

    do_(){
        let control = this.control;
        let droad_ = this.droad_;
        let road_ = null;

        let label = this.label_entry.val();
        let mean = Number(this.mean_entry.val());
        let std_dev = Number(this.std_dev_entry.val());

        if(this.edit){
            road_ = control.road;
        }
        else{
            road_ = droad_.object;
        }

        if(this.edit){
            if(!label){
                alert(NAME_INPUT_ERROR);
                this.label_entry.focus();
            }
            else if(mean != 0 && !mean){
                alert('invalid mean');
                this.mean_entry.focus();
            }
            else if(!std_dev || std_dev < 0){
                alert('invalid standard deviation');
                this.std_dev_entry.focus();
            }
            else{
                this.value = [label, mean, std_dev];
            }

            if(this.value){
                control.label = this.value[0];
                control.mean = this.value[1];
                control.std_dev = this.value[2];
                this.modal.modal('hide');
            }
        }
        else{
            let x0 = this.x0;
            let y0 = this.y0;
            let x1 = this.x1;
            let y1 = this.y1;

            let lane = point_to_lane(road_, x0, y0);
            if(0 <= lane && lane < road_.get_lanes()){
                if(!label){
                    alert(NAME_INPUT_ERROR);
                    this.label_entry.focus();
                }
                else if(mean != 0 && !mean){
                    alert('invalid mean');
                    this.mean_entry.focus();
                }
                else if(!std_dev || std_dev < 0){
                    alert('invalid standard deviation');
                    this.std_dev_entry.focus();
                }
                else{
                    this.value = [label, mean, std_dev];
                }

                if(this.value){
                    let first_pos = point_to_dist(road_, x0, y0);
                    let next_pos = point_to_dist(road_, x1, y1);

                    if(first_pos > next_pos){
                        let temp = first_pos;
                        first_pos = next_pos;
                        next_pos = temp;
                    }

                    let pt_stop = new BusTerminalZone(road_, first_pos, lane, next_pos-first_pos, this.value[0], this.value[1], this.value[2]);
                    this.view.update_undo_state(this.model);
                    this.model.add_control(pt_stop);
                    let segments = new Map();
                    segments.set('src', droad_.get_segment(x0, y0));
                    segments.set('dst', droad_.get_segment(x1, y1));
                    create_dpt_stop(this.view, pt_stop, segments);
                    this.modal.modal('hide');
                }

            }
        }
    }
}

class TypeRestrictionPopup{
    constructor(){

    }

    show(view, model, droad_, control, x0, y0, x1, y1, bias=0.0, types=[], edit=false){
        this.view = view;
        this.model = model;
        this.droad_ = droad_;
        this.control = control;
        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
        this.bias = bias;
        this.value = null;
        this.edit = edit;

        this.modal = $('#create-restrict');
        this.bias_entry = $('#restrict-bias');
        this.restrict_priority = $('#restrict-priority');

        this.bias_entry.val(bias);
        this.restrict_priority.val(types);

        this.modal.modal();

    }

    do_(){
        let control = this.control;
        let droad_ = this.droad_;
        let road_ = null;
        if(this.edit){
            road_ = control.road;
        }
        else{
            road_ = droad_.object;
        }
        let bias = Number(this.bias_entry.val());

        if(this.edit){
            if(check_float(bias)){
                let v_list = this.restrict_priority.val();

                if(v_list && v_list.length <= 0){
                    alert(VEHICLE_INPUT_ERROR);
                    this.bias_entry.focus();
                }
                else if(!this.check_valid(bias)){
                    alert(BIAS_INPUT_ERROR);
                    this.bias_entry.focus();
                }
                else{
                    this.value = v_list;
                    this.bias = bias;
                    this.modal.modal('hide');
                }

                if(this.value){
                    control.bias = bias;
                    control.white_list = v_list;
                }
            }
            else{
                alert(NONNUMERIC_ERROR);
                this.bias_entry.focus();
            }
        }

        else{
            let x0 = this.x0;
            let y0 = this.y0;
            let x1 = this.x1;
            let y1 = this.y1;

            let lane = point_to_lane(road_, x0, y0);
            if(0 <= lane && lane < road_.get_lanes()){
                if(check_float(bias)){
                    let v_list = this.restrict_priority.val() || [];

                    if(v_list.length <= 0){
                        alert(VEHICLE_INPUT_ERROR);
                        this.bias_entry.focus();
                    }

                    else if(!this.check_valid(bias)){
                        alert(BIAS_INPUT_ERROR);
                        this.bias_entry.focus();
                    }
                    else{
                        this.value = v_list;
                        this.bias = bias;
                        this.modal.modal('hide');
                    }
                    if(this.value){
                        let first_pos = point_to_dist(road_, x0, y0);
                        let next_pos = point_to_dist(road_, x1, y1);

                        if(first_pos > next_pos){
                            let temp = first_pos;
                            first_pos = next_pos;
                            next_pos = temp;
                        }

                        let restrict_sign = new TypeRestrictionZone(road_, first_pos, lane, next_pos-first_pos, bias, this.value);
                        this.view.update_undo_state(this.model);
                        this.model.add_control(restrict_sign);
                        let segments = new Map();
                        segments.set('src', droad_.get_segment(x0, y0));
                        segments.set('dst', droad_.get_segment(x1, y1));
                        create_dtype_restriction(this.view, restrict_sign, segments);
                    }

                }
                else{
                    alert(NONNUMERIC_ERROR);
                    this.bias_entry.focus();
                }
            }
        }

    }

    check_valid(bias){
        return (bias >= 0.0 && bias <= 1.0);
    }
}

class StoplightPopup{
    constructor(){

    }

    show(view, model, droad_, control, x, y, phase=null, init_state=null, start_time = null, edit=false){
        this.view = view;
        this.model = model;
        this.droad_ = droad_;
        this.control = control;
        this.x = x;
        this.y = y;
        this.edit = edit;

        this.value = null;
        this.red_time_entry = $('#stoplight-red-time');
        this.green_time_entry = $('#stoplight-green-time');
        this.yellow_time_entry = $('#stoplight-yellow-time');
        this.start_time_entry = $('#stoplight-start-time');

        if(phase){
            this.red_time_entry.val(phase[0]);
            this.green_time_entry.val(phase[1]);
            this.yellow_time_entry.val(phase[2]);
        }
        else{
            this.red_time_entry.val(DEFAULT_RED);
            this.green_time_entry.val(DEFAULT_GREEN);
            this.yellow_time_entry.val(DEFAULT_YELLOW);
        }

        if(start_time && start_time >= 0){
            this.start_time_entry.val(start_time);
        }
        else{
            this.start_time_entry.val(DEFAULT_START_TIME);
        }

        if(init_state != null){
            $('input[name="' + 'stoplight-init-state'+ '"]').val([init_state]);
        }

        this.modal = $('#create-stoplight');

        this.modal.modal();
    }

    do_(){
        let red_phase = Number(this.red_time_entry.val());
        let green_phase = Number(this.green_time_entry.val());
        let yellow_phase = Number(this.yellow_time_entry.val());
        let start = Number(this.start_time_entry.val());

        let droad_ = this.droad_;
        let control = this.control;
        let road_ = null;
        if(this.edit){
            road_ = control.road;
        }
        else{
            road_ = droad_.object;
        }
        let x = this.x;
        let y = this.y;

        if(red_phase<=0 || !check_int(red_phase)){
            alert(NONINT_ERROR);
            this.red_time_entry.focus();
        }
        else if(green_phase<=0 || !check_int(green_phase)){
            alert(NONINT_ERROR);
            this.green_time_entry.focus();
        }
        else if(yellow_phase<=0 || !check_int(yellow_phase)){
            alert(NONINT_ERROR);
            this.yellow_time_entry.focus();
        }
        else if(start<0 || !check_int(start)){
            alert(NONINT_ERROR);
            this.start_time_entry.focus();
        }
        else{
            this.value = [[red_phase, green_phase, yellow_phase], $("input:radio[name=stoplight-init-state]:checked").val(), start];
            this.modal.modal('hide');
        }

        if(this.value){
            let phase = this.value[0];
            let state = this.value[1];
            if(!state){
                state = 0;
            }
            let start_time = this.value[2];

            if(this.edit){
                control.phase = phase;
                control.set_init_state([state, start_time]);
            }
            else{
                let pos = point_to_dist(road_, x, y);
                let lane = point_to_lane(road_, x, y);

                let stoplight = new StopLight(road_, pos, lane, phase, state, start_time);
                this.view.update_undo_state(this.model);
                this.model.add_control(stoplight);
                create_dstoplight(this.view, stoplight);
            }
        }
    }
}

class DataCollectionPopup{
    constructor(){

    }

    show(view, model, droad_, x0, y0, x1, y1){
        this.view = view;
        this.model = model;
        this.droad_ = droad_;
        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
        this.modal = $('#create-survey');
        this.value = null;

        this.modal.modal();
    }

    do_(){
        let droad_ = this.droad_;
        let road_ = droad_.object;
        let x0 = this.x0;
        let y0 = this.y0;
        let x1 = this.x1;
        let y1 = this.y1;
        this.frequency = $("input:radio[name=survey-frequency]:checked");

        if(this.frequency.val()){
            this.value = this.frequency.val();
            this.modal.modal('hide');
        }
        else{
            alert(INPUT_MISSING_ERROR);
        }

        if(this.value){
            let lane = point_to_lane(road_, x0, y0);
            let first_pos = point_to_dist(road_, x0, y0);
            let next_pos = point_to_dist(road_, x1, y1);

            if(first_pos > next_pos){
                let temp = first_pos;
                first_pos = next_pos;
                next_pos = temp;
            }

            let survey_zone  = new SurveyZone(road_, first_pos, lane, next_pos-first_pos, this.value);
            this.model.add_surveyor(survey_zone);
            let segments = new Map();
            segments.set('src', droad_.get_segment(x0, y0));
            segments.set('dst', droad_.get_segment(x1, y1));

            create_dsurvey_zone(this.view, survey_zone, segments);
        }

    }
}

class ConflictAreaPopup{
    constructor(){

    }

    show(view, model, droad){
        this.view = view;
        this.model = model;
        this.droad_ = droad;

        this.modal = $('#create-conflict');
        this.affected_lanes = $('#conflict-lanes');
        this.value = null;

        this.affected_lanes.empty();
        for(let ctr=1; ctr<=this.droad_.object.get_lanes(); ctr++){
            let option = document.createElement('option');
            option.value = ctr;
            option.innerHTML = ctr;
            this.affected_lanes.append(option, ctr);
        }

        this.droad_.item.style("stroke", '#BDBB37');

        this.modal.modal();

    }

    reset_droad_color(){
        this.droad_.item.style("stroke", IROAD_FILL);
    }

    do_(){
        let droad_ = this.droad_;
        let road_ = droad_.object;

        if(this.affected_lanes.val()){
            this.value = this.affected_lanes.val();
            this.modal.modal('hide');
        }
        else{
            alert(INPUT_MISSING_ERROR);
        }

        if(this.value){

            let entry = 0;
            let exit_ = road_.length;

            if(entry > exit_){
                let temp = entry;
                entry = exit_;
                exit_ = temp;
            }
            let lanes = [];
            this.value.forEach(function(lane){
                lanes.push(Number(lane)-1);
            });

            let conflict_area = new ConflictArea(road_, entry, lanes[0], exit_ - entry, lanes.length - 1);
            this.view.update_undo_state(this.model);
            this.model.add_conflict_zone(conflict_area);
            // let segments = get_inner_segments(droad_, [0, 0], [x1, y1]);

            create_dconflict_area(this.view, conflict_area, null);
        }
    }
}

class MatchConflictPopup{
    constructor(){
    }

    show(view, model){
        this.value = null;
        this.view = view;
        this.model = model;
        this.zone_map = [];

        this.modal = $('#match-conflict');
        this.match_conflict_data = $('#match-conflict-data');
        this.match_conflict_name = $('#match-conflict-name');

        this.match_conflict_data.empty();
        this.populate_list();

        this.modal.modal();
    }

    do_(){
        if(this.match_conflict_data.val()){
            this.value = this.match_conflict_data.val();
        }

        if(this.value){

            let controller_id_counter = count();
            let g = controller_id_counter.next().value;

            let temp = [];
            for(let value of this.model.conflict_zones.values()){
                for(let c_zone of value){
                    for(let c_group of c_zone.conflict_group){
                        if(!temp.includes(c_group)){
                            temp.push(c_group);
                        }
                    }
                }
            }

            while(temp.includes(g)){
                g = controller_id_counter.next().value;
            }

            for(let id_ of this.value){
                let zone = this.model.get_conf_zone_by_id(id_);
                zone.conflict_group.push(g);
            }
            this.match_conflict_name.val(g);
            alert(MATCH_CONFLICT_SUCCESS);
        }
        else{
            alert(MATCH_CONFLICT_ERROR);
        }
    }

    clear_conflict_group(){
        let value = null;
        if(this.match_conflict_data.val()){
            value = this.match_conflict_data.val();
        }

        if(value){
            for(let id_ of value){
                let zone = this.model.get_conf_zone_by_id(id_);
                zone.conflict_group = [];
            }
            this.match_conflict_name.val('');
            alert(CLEAR_CONFLICT_GROUP_SUCCESS);
        }
        else{
            alert(CLEAR_CONFLICT_GROUP_ERROR);
        }
    }

    populate_list(){
        let conf_zone = this.model.conflict_zones;
        let key_iter = conf_zone.keys();
        let keys = [];
        for(let ctr=0; ctr<conf_zone.size; ctr++){
            keys.push(key_iter.next().value);
        }

        for(let ctr=0; ctr<keys.length; ctr++){
            let road = keys[ctr];
            for(let ctr2=0; ctr2<conf_zone.get(road).length; ctr2++){
                let zone = conf_zone.get(road)[ctr2];

                let option = document.createElement('option');
                option.value = zone.id;
                option.innerHTML = zone.id;
                this.match_conflict_data.append(option, zone.id);

                this.zone_map.push(zone.id);
            }
        }
    }

    on_select(ids_){
        this.reset_colors();

        let grp = null;

        for(let id_ of ids_){
            let conf_area = this.model.get_conf_zone_by_id(id_);
            if(conf_area){
                let dkey = this.view.get_registry_key(conf_area);
                let dobj = this.view.registry.get(dkey);

                dobj.item.style("fill-opacity", 0.9)
            }
        }
        if(ids_.length == 1){
            let c_a = this.model.get_conf_zone_by_id(ids_[0]);
            this.match_conflict_name.val(c_a.conflict_group);
        }

        //this.match_conflict_name.val(conf_area.conflict_group);
    }

    reset_colors(){
        for(let road of this.model.iroads){
            let conf_zones = this.model.conflict_zones.get(road);
            if(conf_zones){
                for(let conf_zone of conf_zones){
                    let dkey = this.view.get_registry_key(conf_zone);
                    let dobj = this.view.registry.get(dkey);

                    dobj.item.style("fill-opacity", 0.2);
                }
            }
        }
    }
}

class SetScalingPopup{
    constructor(){

    }

    show(view, model){
        this.view = view;
        this.model = model;

        this.modal = $('#set-scaling');
        this.scale_length = $('#scale-length');
        this.value = null;

        this.modal.modal();
    }

    do_(){
        let view = this.view;
        let model = this.model;

        let length = Number(this.scale_length.val());

        if(length && check_float(length)){
            this.value = length;
        }
        else{
            alert(NONNUMERIC_ERROR);
            this.scale_length.focus();
        }

        if(this.value){
            let x0 = view.vars.get('lp_point')[0];
            let y0 = view.vars.get('lp_point')[1];
            let x1 = view.vars.get('lr_point')[0];
            let y1 = view.vars.get('lr_point')[1];
            let z = view.zoom_level;

            let d = distance([x1/z - x0/z, y1/z - y0/z]);

            try{
                config.set_px2m_factor(this.value/d);
                view.status_msg('');
                app.set_default_state();
                this.modal.modal('hide');
            }

            catch(err){
                console.log(err);
                alert(SCALING_ERROR);
                this.scale_length.focus()
            }
        }
    }
}

class LandmarkPopup{
    constructor(){

    }

    show(view, model, x, y){
        this.view = view;
        this.model = model;
        this.x = x;
        this.y = y;
        this.value = null;

        this.modal = $('#create-landmark');
        this.size = $('#landmark-size');
        this.label = $('#landmark-label');

        this.modal.modal();
    }

    do_(){
        let view = this.view;
        let model = this.model;
        let x = this.x;
        let y = this.y;

        let size = Number(this.size.val());
        let label = this.label.val();

        if(!label){
            alert(LANDMARK_INPUT_ERROR);
            this.label.focus();
        }

        else{
            this.value = [size, label];
            this.modal.modal('hide');
        }

        if(this.value){
            let landmark = new Landmark(x, y, this.value[0], this.value[1]);
            view.update_undo_state(model);
            model.add_landmark(landmark);
            create_dlandmark(view, landmark);
        }
    }
}