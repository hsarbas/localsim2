class SelectControl{
    constructor(){
        this.view = null;
        this.model = null;
        this.event = null;
    }

    reset_colors(view, model){
        for(let r of model.uroads){
            let dkey = view.get_registry_key(r);
            let droad = view.registry.get(dkey);
            droad.item.style('stroke', UROAD_FILL);
        }

        for(let r of model.iroads){
            let dkey = view.get_registry_key(r);
            let droad = view.registry.get(dkey);
            droad.item.style('stroke', IROAD_FILL);
        }
    }

    double_click(view, model, event){
        let obj = view.vars.get('cached_item');

        if(obj instanceof DURoad){
            edit_uroad(view, model, obj.object);
        }
        else if(obj instanceof DIRoad || obj instanceof DConflictArea){
            if(obj instanceof DConflictArea){
                let road = obj.object.road;
                let dkey = view.get_registry_key(road);
                obj = view.registry.get(dkey);
            }
            edit_iroad(view, model, obj.object);
        }
        else if(obj instanceof DControlZone){
            edit_zone_control(view, model, obj.object);
        }
        else if(obj instanceof DControlLine){
            edit_line_control(view, model, obj.object);
        }
    }

    left_press(view, model, event){
        //view.update_undo_state(model);
        this.reset_colors(view, model);

        let obj = view.vars.get('cached_item');
        let x = view.vars.get('lp_point')[0];
        let y = view.vars.get('lp_point')[1];
        x = x / view.zoom_level;
        y = y / view.zoom_level;

        if(obj instanceof DControlZone || obj instanceof DSurveyZone){
            obj = obj.object;
            view.vars.set('init_pos', point_to_dist(obj.road, x, y));
        }

        if(obj instanceof DNode){
            let items = view.get_item_selected(event, true);

            for(let item of items){
                let road = view.registry.get(item);

                if(road instanceof DURoad){
                    if(obj.object == road.object.src){
                        view.vars.set('init_pos', [road.object.dst.x, road.object.dst.y]);
                    }
                    else if(obj.object == road.object.dst){
                        view.vars.set('init_pos', [road.object.src.x, road.object.src.y]);
                    }
                    else{
                        view.vars.set('init_pos', 'bend');
                    }
                }
                else if(road instanceof DIRoad){
                    view.vars.set('cached_conflict', road);
                    if(obj.object == road.object.src){
                        view.vars.set('init_pos', [road.object.src_road.src.x, road.object.src_road.src.y]);
                    }
                    else if(obj.object == road.object.dst){
                        view.vars.set('init_pos', [road.object.dst_road.dst.x, road.object.dst_road.dst.y]);
                    }
                    else{
                        view.vars.set('init_pos', 'bend');
                    }
                }
            }
        }

        if(obj instanceof DURoad){
            obj.item.style('stroke', '#6487A5');

            view.vars.set('init_bends', []);
            view.vars.set('init_src', [obj.object.src.x, obj.object.src.y]);
            view.vars.set('init_dst', [obj.object.dst.x, obj.object.dst.y]);
            for(let split_node of obj.object.segments.get_split_nodes()){
                view.vars.get('init_bends').push([split_node.x, split_node.y]);
            }
        }

        // if (obj instanceof DConflictArea){
        //     let road = obj.object.road;
        //     let dkey = view.get_registry_key(road);
        //     let droad = view.registry.get(dkey);
        //
        //
        //     droad.item.style('stroke', '#6487A5');
        //
        //     view.vars.set('init_bends', []);
        //     view.vars.set('init_src', [droad.object.src_road.dst.x, droad.object.src_road.dst.y]);
        //     view.vars.set('init_dst', [droad.object.dst_road.src.x, droad.object.dst_road.src.y]);
        //     for(let split_node of droad.object.segments.get_split_nodes()){
        //         view.vars.get('init_bends').push([split_node.x, split_node.y]);
        //     }
        // }

        if(obj instanceof DIRoad || obj instanceof DConflictArea){

            if(obj instanceof DConflictArea){
                let road = obj.object.road;
                let dkey = view.get_registry_key(road);
                obj = view.registry.get(dkey);
            }

            obj.item.style('stroke', '#6487A5');

            view.vars.set('init_bends', []);
            view.vars.set('init_src', [obj.object.src_road.dst.x, obj.object.src_road.dst.y]);
            view.vars.set('init_dst', [obj.object.dst_road.src.x, obj.object.dst_road.src.y]);
            for(let split_node of obj.object.segments.get_split_nodes()){
                view.vars.get('init_bends').push([split_node.x, split_node.y]);
            }
        }
    }

    left_motion(view, model, event){
        let obj = view.vars.get('cached_item');
        let x = view.vars.get('lm_point')[0];
        let y = view.vars.get('lm_point')[1];
        let c = x / view.zoom_level;
        let d = y / view.zoom_level;

        let lp_x = view.vars.get('lp_point')[0] / view.zoom_level;
        let lp_y = view.vars.get('lp_point')[1] / view.zoom_level;

        if(obj instanceof DNode){
            if(view.vars.get('init_pos') && view.vars.get('init_pos') != 'bend'){
                let a = view.vars.get('init_pos')[0];
                let b = view.vars.get('init_pos')[1];
                if(distance([x-a, y-b]) > config.to_px(MIN_ROADLENGTH)){
                    obj = obj.object;
                    obj.move(c, d);
                }
            }
            else{
                obj = obj.object;
                obj.move(c, d)
            }
        }

        else if(obj instanceof DURoad || obj instanceof DIRoad || obj instanceof DConflictArea){

            if(obj instanceof DConflictArea){
                let road = obj.object.road;
                let dkey = view.get_registry_key(road);
                obj = view.registry.get(dkey);
            }

            view.status_msg(obj.object.label);
            let src = obj.object.src;
            let dst = obj.object.dst;

            let src_pos = view.vars.get('init_src');
            let dst_pos = view.vars.get('init_dst');

            let new_x = src_pos[0] + (c - lp_x);
            let new_y = src_pos[1] + (d - lp_y);

            src.move(new_x, new_y);

            new_x = dst_pos[0] + (c - lp_x);
            new_y = dst_pos[1] + (d - lp_y);
            dst.move(new_x, new_y);

            let bends_pos = view.vars.get('init_bends');
            let split_nodes = obj.object.segments.get_split_nodes();

            for(let ctr=0; ctr<bends_pos.length; ctr++){
                let pos = bends_pos[ctr];
                let split_node = split_nodes[ctr];

                new_x = pos[0] + (c - lp_x);
                new_y = pos[1] + (d - lp_y);

                split_node.move(new_x, new_y);
            }
        }

        else if(obj instanceof DLandmark){
            obj.object.move(c, d);
        }

        else if(obj instanceof DControlLine){
            let segment = point_to_segment(obj.object.road, c, d);
            if(segment){
                obj.segment = segment;
                obj.object.set_pos(point_to_dist(obj.object.road, c, d));
            }
        }

        else if((obj instanceof DControlZone || obj instanceof DSurveyZone) && view.vars.get('init_pos')){
            let base = obj.object;
            let diff = point_to_dist(base.road, c, d) - view.vars.get('init_pos');
            let pos = base.pos + diff;
            let zone = base.exit + diff;

            if(pos >= 0 && zone <= base.road.length){
                base.set_pos(pos);
                base.exit = zone;
                view.vars.set('init_pos', point_to_dist(base.road, c, d));
            }
        }
    }

    left_release(view, model, event){
        view.status_msg('');
        this.reset_colors(view, model);
    }

    right_click(view, model, event){
        this.view = view;
        this.model = model;
        this.event = event;

        //let obj = view.get_object(event);
        let obj = view.vars.get('cached_item');

        if(obj instanceof DURoad || obj instanceof DIRoad){
            view.show_rc_menu(event, [$('#add-split'), $('#delete-road'), $('#properties')]);
        }

        else if(obj instanceof DNode && obj.object.dir == 'seg'){
            view.show_rc_menu(event, [$('#remove-split')]);
        }

        else if(obj instanceof DControlLine){
            view.show_rc_menu(event, [$('#delete-control'), $('#properties')]);
        }

        else if(obj instanceof DControlZone){
            view.show_rc_menu(event, [$('#delete-control'), $('#properties')]);
        }

        else if(obj instanceof DSurveyZone){
            view.show_rc_menu(event, [$('#delete-control')]);
        }
        else if(obj instanceof DConflictArea){
            view.show_rc_menu(event, [$('#delete-conflict')]);
        }

        else if(obj instanceof DLandmark){
            view.show_rc_menu(event, [$('#delete-landmark')]);
        }

    }

    right_menu(div, view){
        let x = this.view.vars.get('rc_point')[0] / view.zoom_level;
        let y = this.view.vars.get('rc_point')[1] / view.zoom_level;
        let obj = this.view.vars.get('cached_item');
        let segment = null;

        if(div == 'add-split'){
            if(obj instanceof DURoad || obj instanceof DIRoad){
                segment = obj.get_segment(x, y);
            }

            if(segment){
                let split = obj.object.split(segment, x, y);
                new DNode(this.view, split);
            }
        }

        else if(div == 'remove-split'){
            let items = this.view.get_item_selected(this.event, true);

            for(let ctr=0; ctr<items.length; ctr++){
                let road = this.view.registry.get(items[ctr]);
                if(road instanceof DURoad || road instanceof DIRoad){
                    road.object.merge(obj.object);
                    break;
                }
            }
        }

        else if(div == 'delete-road'){
            if(obj instanceof DURoad || obj instanceof DIRoad){
                if(confirm("Delete road and all items associated with it?")){
                    this.view.update_undo_state(this.model);
                    this.model.remove_road(obj.object);
                }
            }
        }

        else if(div == 'delete-control'){
            if(confirm("Are you sure you want to delete this control?")){
                if(obj.object.constructor.name == 'SurveyZone'){
                    this.view.update_undo_state(this.model);
                    this.model.remove_surveyor(obj.object);
                }
                else{
                    this.view.update_undo_state(this.model);
                    this.model.remove_control(obj.object);
                }

            }
        }

        else if(div == 'delete-landmark'){
            if(confirm("Are you sure you want to delete this landmark?")){
                if(obj.object.constructor.name == 'Landmark'){
                    this.view.update_undo_state(this.model);
                    this.model.remove_landmark(obj.object);
                }
            }
        }

        else if(div == 'delete-conflict'){
            if(confirm("Are you sure you want to delete this conflict area?")){
                if(obj.object.constructor.name == 'ConflictArea'){
                    this.view.update_undo_state(this.model);
                    this.model.remove_conflict_zone(obj.object);
                }
            }
        }

        else if(div == 'properties'){
            if(obj instanceof DURoad){
                edit_uroad(this.view, this.model, obj.object);
            }
            else if(obj instanceof DIRoad){
                edit_iroad(this.view, this.model, obj.object);
            }
            else if(obj instanceof DControlZone){
                edit_zone_control(this.view, this.model, obj.object);
            }
            else if(obj instanceof DControlLine){
                edit_line_control(this.view, this.model, obj.object);
            }

        }
    }
}

class URoadCreateControl{
    constructor(){
    }

    left_press(view, model, event){
        if(view.vars.has('trace_start') && view.vars.has('trace_follow') && view.vars.has('trace_line')){
            view.remove_trace();
        }
        let x = view.vars.get('lp_point')[0];
        let y = view.vars.get('lp_point')[1];

        view.start_trace(x, y, NODE_RADIUS, 2, NODE_SRC_FILL, NODE_DST_FILL);
    }

    left_motion(view, model, event){
        let x0 = view.vars.get('lp_point')[0];
        let y0 = view.vars.get('lp_point')[1];
        let x = view.vars.get('lm_point')[0];
        let y = view.vars.get('lm_point')[1];
        let z = view.zoom_level;
        view.status_msg('Length: ' + String(round(config.to_m(distance([x/z - x0/z, y/z - y0/z])), 1)) + ' meters');


        if(view.vars.has('trace_start')){
            view.move_trace(x, y);
        }
    }

    left_release(view, model, event){
        let x0 = view.vars.get('lp_point')[0];
        let y0 = view.vars.get('lp_point')[1];

        let x1 = view.vars.get('lr_point')[0];
        let y1 = view.vars.get('lr_point')[1];

        x0 = x0 / view.zoom_level;
        y0 = y0 / view.zoom_level;
        x1 = x1 / view.zoom_level;
        y1 = y1 / view.zoom_level;

        if(distance([x1-x0, y1-y0]) < config.to_px(MIN_ROADLENGTH)){
            alert(ROAD_SHORT_ERROR);
        }
        else{
            create_uroad(view, model, x0, y0, x1, y1);
        }
        view.remove_trace();
        view.status_msg('');
    }

    right_click(view, model, event){

    }
    double_click(view, model, event){

    }
}

class IRoadCreateControl{
    constructor(){
        this.obj1 = null;
    }

    left_press(view, model, event){
        if(view.vars.has('trace_start') && view.vars.has('trace_follow') && view.vars.has('trace_line')){
            view.remove_trace();
        }
        this.obj1 = event.target.__data__;
        let x = view.vars.get('lp_point')[0];
        let y = view.vars.get('lp_point')[1];
        view.start_trace(x, y, NODE_RADIUS, 2, 'red', 'red');
    }

    left_motion(view, model, event){
        let x0 = view.vars.get('lp_point')[0];
        let y0 = view.vars.get('lp_point')[1];
        let x = view.vars.get('lm_point')[0];
        let y = view.vars.get('lm_point')[1];
        view.status_msg('Length: ' + String(round(config.to_m(distance([x-x0, y-y0])), 1)) + ' meters');

        view.move_trace(x, y);
    }

    left_release(view, model, event){

        let obj1 = this.obj1;
        var obj2 = null;

        let lp_x = view.vars.get('lp_point')[0];
        let lp_y = view.vars.get('lp_point')[1];
        let lr_x = view.vars.get('lr_point')[0];
        let lr_y = view.vars.get('lr_point')[1];

        //let id_ = view.get_item_selected(event);
        //obj2 = view.registry.get(id_);
        obj2 = view.get_object(event);


        if(obj1 instanceof DURoad && obj2 instanceof DURoad && (obj1.object != obj2.object)){
            create_iroad(view, model, obj1.object, obj2.object);
        }

        view.remove_trace();
        view.status_msg('');
    }

    right_click(view, model, event){

    }

    right_menu(view, model, event){

    }

    double_click(view, model, event){

    }
}

class StopSignCreateControl{
    constructor(){
    }

    left_press(view, model, event){

    }

    left_motion(view, model, event){

    }

    left_release(view, model, event){
        let x = view.vars.get('lp_point')[0];
        let y = view.vars.get('lp_point')[1];
        let obj = view.get_object(event);

        if(obj instanceof DURoad || obj instanceof DIRoad){
            x = x / view.zoom_level;
            y = y / view.zoom_level;

            create_stop_yield(view, model, x, y, obj.object);
        }
    }

    right_click(view, model, event){

    }

    right_menu(view, model, event){

    }

    double_click(view, model, event){

    }
}

class SpeedLimitCreateControl{
    constructor(){
        this.obj1 = null;
    }

    left_press(view, model, event){
        if(view.vars.has('trace_start') && view.vars.has('trace_follow') && view.vars.has('trace_line')){
            view.remove_trace();
        }
        let x = view.vars.get('lp_point')[0];
        let y = view.vars.get('lp_point')[1];

        this.obj1 = event.target.__data__;
        view.start_trace(x, y, NODE_RADIUS-2, 2, 'black', 'black');
    }

    left_motion(view, model, event){
        let x0 = view.vars.get('lp_point')[0];
        let y0 = view.vars.get('lp_point')[1];
        let x = view.vars.get('lm_point')[0];
        let y = view.vars.get('lm_point')[1];

        view.move_trace(x, y);
    }

    left_release(view, model, event){
        let x0 = view.vars.get('lp_point')[0];
        let y0 = view.vars.get('lp_point')[1];
        let x1 = view.vars.get('lr_point')[0];
        let y1 = view.vars.get('lr_point')[1];
        let obj1 = this.obj1;
        let obj2 = null;
        let obj = null;

        let objects = view.get_item_selected(event, true);

        for(let ctr=0; ctr<objects.length; ctr++){
            if(view.registry.get(objects[ctr]) instanceof DURoad || view.registry.get(objects[ctr]) instanceof DIRoad){
                obj2 = view.registry.get(objects[ctr]);
                break;
            }
        }

        if(obj1 && obj2 && obj1.object == obj2.object){
            obj = obj1;
        }

        if(obj && (obj instanceof DURoad || obj instanceof DIRoad)){
            x0 = x0 / view.zoom_level;
            y0 = y0 / view.zoom_level;
            x1 = x1 / view.zoom_level;
            y1 = y1 / view.zoom_level;

            create_speed_limit(view, model, x0, y0, x1, y1, obj);
        }
        view.remove_trace();
    }

    right_click(view, model, event){
    }

    right_menu(view, model, event){

    }

    double_click(view, model, event){

    }
}

class TypeRestrictionCreateControl{
    constructor(){
    }

    left_press(view, model, event){
        if(view.vars.has('trace_start') && view.vars.has('trace_follow') && view.vars.has('trace_line')){
            view.remove_trace();
        }
        this.obj1 = event.target.__data__;
        let x = view.vars.get('lp_point')[0];
        let y = view.vars.get('lp_point')[1];
        view.start_trace(x, y, NODE_RADIUS-2, 2, 'black', 'black');
    }

    left_motion(view, model, event){
        let x0 = view.vars.get('lp_point')[0];
        let y0 = view.vars.get('lp_point')[1];
        let x = view.vars.get('lm_point')[0];
        let y = view.vars.get('lm_point')[1];

        view.move_trace(x, y);
    }

    left_release(view, model, event){
        let x0 = view.vars.get('lp_point')[0];
        let y0 = view.vars.get('lp_point')[1];
        let x1 = view.vars.get('lr_point')[0];
        let y1 = view.vars.get('lr_point')[1];
        let obj1 = this.obj1;
        let obj2 = null;
        let obj = null;

        let objects = view.get_item_selected(event, true);

        for(let ctr=0; ctr<objects.length; ctr++){
            if(view.registry.get(objects[ctr]) instanceof DURoad || view.registry.get(objects[ctr]) instanceof DIRoad){
                obj2 = view.registry.get(objects[ctr]);
                break;
            }
        }

        if(obj1 && obj2 && obj1.object == obj2.object){
            obj = obj1;
        }

        if(obj && (obj instanceof DURoad || obj instanceof DIRoad)){
            x0 = x0 / view.zoom_level;
            y0 = y0 / view.zoom_level;
            x1 = x1 / view.zoom_level;
            y1 = y1 / view.zoom_level;

            create_type_restriction(view, model, obj, x0, y0, x1, y1);
        }
        view.remove_trace();
    }

    right_click(view, model, event){
        console.log('RestrictControl right click');
    }

    right_menu(view, model, event){

    }

    double_click(view, model, event){

    }
}

class SetScalingControl{
    constructor(){
    }

    left_press(view, model, event){
        if(view.vars.has('trace_start') && view.vars.has('trace_follow') && view.vars.has('trace_line')){
            view.remove_trace();
        }
        let x = view.vars.get('lp_point')[0];
        let y = view.vars.get('lp_point')[1];

        view.start_trace(x, y, NODE_RADIUS, 2, 'black', 'black');
    }

    left_motion(view, model, event){
        let x0 = view.vars.get('lp_point')[0];
        let y0 = view.vars.get('lp_point')[1];
        let x = view.vars.get('lm_point')[0];
        let y = view.vars.get('lm_point')[1];
        let z = view.zoom_level;

        view.status_msg('Length: ' + String(round(config.to_m(distance([x/z - x0/z, y/z - y0/z])), 1)) + ' meters');
        view.move_trace(x, y);
    }

    left_release(view, model, event){
        view.remove_trace();

        app.set_scaling_popup.show(view, model);
    }

    right_click(view, model, event){

    }

    right_menu(view, model, event){

    }

    double_click(view, model, event){

    }
}

class NoActionControl{
    constructor(){
    }
    left_press(){

    }
    left_motion(){

    }
    left_release(){

    }
    right_click(){

    }
    double_click(){

    }
}

class SurveyZoneCreateControl{
    constructor(){
    }

    left_press(view, model, event){
        if(view.vars.has('trace_start') && view.vars.has('trace_follow') && view.vars.has('trace_line')){
            view.remove_trace();
        }
        this.obj1 = event.target.__data__;
        let x = view.vars.get('lp_point')[0];
        let y = view.vars.get('lp_point')[1];
        view.start_trace(x, y, NODE_RADIUS-2, 2, 'black', 'black');
    }

    left_motion(view, model, event){
        let x0 = view.vars.get('lp_point')[0];
        let y0 = view.vars.get('lp_point')[1];
        let x = view.vars.get('lm_point')[0];
        let y = view.vars.get('lm_point')[1];

        view.move_trace(x, y);
    }

    left_release(view, model, event){
        let x0 = view.vars.get('lp_point')[0];
        let y0 = view.vars.get('lp_point')[1];
        let x1 = view.vars.get('lr_point')[0];
        let y1 = view.vars.get('lr_point')[1];
        let obj1 = this.obj1;
        let obj2 = null;
        let obj = null;

        let objects = view.get_item_selected(event, true);

        for(let ctr=0; ctr<objects.length; ctr++){
            if(view.registry.get(objects[ctr]) instanceof DURoad || view.registry.get(objects[ctr]) instanceof DIRoad){
                obj2 = view.registry.get(objects[ctr]);
                break;
            }
        }

        if(obj1 instanceof DConflictArea){
                let road = obj1.object.road;
                let registry_key = view.get_registry_key(road);
                obj1 = view.registry.get(registry_key);
            }

        if(obj2 instanceof DConflictArea){
                let road = obj2.object.road;
                let registry_key = view.get_registry_key(road);
                obj2 = view.registry.get(registry_key);
            }

        if(obj1 && obj2 && obj1.object == obj2.object){
            obj = obj1;
        }

        console.log(obj, obj1, obj2);

        if(obj && (obj instanceof DURoad || obj instanceof DIRoad || obj instanceof DConflictArea)){
            x0 = x0 / view.zoom_level;
            y0 = y0 / view.zoom_level;
            x1 = x1 / view.zoom_level;
            y1 = y1 / view.zoom_level;

            let survey_zone  = create_survey_zone(view, model, obj, x0, y0, x1, y1);
            view.update_undo_state(model);
            model.add_surveyor(survey_zone);
            let segments = new Map();
            segments.set('src', obj.get_segment(x0, y0));
            segments.set('dst', obj.get_segment(x1, y1));

            create_dsurvey_zone(view, survey_zone, segments);
        }
        view.remove_trace();
    }

    right_click(view, model, event){

    }

    right_menu(view, model, event){

    }

    double_click(view, model, event){

    }
}

class StoplightCreateControl{
    constructor(){
    }

    left_press(view, model, event){

    }

    left_motion(view, model, event){

    }

    left_release(view, model, event){
        let x = view.vars.get('lp_point')[0];
        let y = view.vars.get('lp_point')[1];
        let obj = view.get_object(event);

        if(obj instanceof DURoad || obj instanceof DIRoad){
            x = x / view.zoom_level;
            y = y / view.zoom_level;

            create_stoplight(view, model, obj, x, y );
        }
    }

    right_click(view, model, event){

    }

    right_menu(view, model, event){

    }

    double_click(view, model, event){

    }
}

class SetConflictAreaControl{
    constructor(){
    }

    left_press(view, model, event){

    }

    left_motion(view, model, event){

    }

    left_release(view, model, event){
        let droad = event.target.__data__;

        if (droad instanceof DIRoad){
            create_conflict_area(view, model, droad)
        }
    }

    right_click(view, model, event){
        match_conflict_area(view, model);
    }

    right_menu(view, model, event){

    }

    double_click(view, model, event){

    }
}

class PTStopCreateControl{
    constructor(){
        this.obj1 = null;
    }

    left_press(view, model, event){
        if(view.vars.has('trace_start') && view.vars.has('trace_follow') && view.vars.has('trace_line')){
            view.remove_trace();
        }
        this.obj1 = event.target.__data__;
        let x = view.vars.get('lp_point')[0];
        let y = view.vars.get('lp_point')[1];
        view.start_trace(x, y, NODE_RADIUS-2, 2, 'black', 'black');
    }

    left_motion(view, model, event){
        let x0 = view.vars.get('lp_point')[0];
        let y0 = view.vars.get('lp_point')[1];
        let x = view.vars.get('lm_point')[0];
        let y = view.vars.get('lm_point')[1];

        view.move_trace(x, y);
    }

    left_release(view, model, event){
        let x0 = view.vars.get('lp_point')[0];
        let y0 = view.vars.get('lp_point')[1];
        let x1 = view.vars.get('lr_point')[0];
        let y1 = view.vars.get('lr_point')[1];
        let obj1 = this.obj1;
        let obj2 = null;
        let obj = null;

        let objects = view.get_item_selected(event, true);

        for(let ctr=0; ctr<objects.length; ctr++){
            if(view.registry.get(objects[ctr]) instanceof DURoad || view.registry.get(objects[ctr]) instanceof DIRoad){
                obj2 = view.registry.get(objects[ctr]);
                break;
            }
        }

        if(obj1 && obj2 && obj1.object == obj2.object){
            obj = obj1;
        }

        if(obj && (obj instanceof DURoad || obj instanceof DIRoad)){
            x0 = x0 / view.zoom_level;
            y0 = y0 / view.zoom_level;
            x1 = x1 / view.zoom_level;
            y1 = y1 / view.zoom_level;

            create_pt_stop(view, model, obj, x0, y0, x1, y1);
        }
        view.remove_trace();
    }

    right_click(view, model, event){

    }

    right_menu(view, model, event){

    }

    double_click(view, model, event){

    }
}

class LandmarkCreateControl{
    constructor(){
    }

    left_press(view, model, event){

    }

    left_motion(view, model, event){

    }

    left_release(view, model, event){
        let x = view.vars.get('lp_point')[0];
        let y = view.vars.get('lp_point')[1];

        x = x / view.zoom_level;
        y = y / view.zoom_level;

        create_landmark(view, model, x, y);
    }

    right_click(view, model, event){

    }

    right_menu(view, model, event){

    }

    double_click(view, model, event){

    }
}