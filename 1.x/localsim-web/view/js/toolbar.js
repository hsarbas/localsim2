class Toolbar{

    constructor(parent){
        this.button_list = [];
        this.button_ui_list = [];

        let container = document.getElementById(parent);

        let group1 = document.createElement('div');
        group1.setAttribute('class', 'toolbar-grp');
        container.appendChild(group1);

        let g1_label = document.createElement('Label');
        g1_label.setAttribute('class', 'toolbar-label');
        g1_label.innerHTML = 'Road Network';

        group1.appendChild(g1_label);

        let group2 = document.createElement('div');
        group2.setAttribute('class', 'toolbar-grp');
        container.appendChild(group2);

        let g2_label = document.createElement('Label');
        g2_label.setAttribute('class', 'toolbar-label');
        g2_label.innerHTML = 'Controls';

        group2.appendChild(g2_label);

        let group3 = document.createElement('div');
        group3.setAttribute('class', 'toolbar-grp');
        container.appendChild(group3);

        let g3_label = document.createElement('Label');
        g3_label.setAttribute('class', 'toolbar-label');
        g3_label.innerHTML = 'Markers   ';

        group3.appendChild(g3_label);


        let uroad_ui_btn = this.create_button('uroad-btn', '../bootstrap/img/uroad.png', 'Link');
        group1.appendChild(uroad_ui_btn);
        this.button_ui_list.push(uroad_ui_btn);

        let iroad_ui_btn = this.create_button('iroad-btn', '../bootstrap/img/iroad.png', 'Transition Link');
        group1.appendChild(iroad_ui_btn);
        this.button_ui_list.push(iroad_ui_btn);

        let conflict_ui_btn = this.create_button('conflict-btn', '../bootstrap/img/conflict.png', 'Conflict Area');
        group1.appendChild(conflict_ui_btn);
        this.button_ui_list.push(conflict_ui_btn);

        let stop_ui_btn = this.create_button('stop-btn', '../bootstrap/img/stop.png', 'Stop/Yield Sign');
        group2.appendChild(stop_ui_btn);
        this.button_ui_list.push(stop_ui_btn);

        let limit_ui_btn = this.create_button('limit-btn', '../bootstrap/img/limit.png', 'Speed Limit Zone');
        group2.appendChild(limit_ui_btn);
        this.button_ui_list.push(limit_ui_btn);

        let stoplight_ui_btn = this.create_button('stoplight-btn', '../bootstrap/img/stoplight.png', 'Stop Light');
        group2.appendChild(stoplight_ui_btn);
        this.button_ui_list.push(stoplight_ui_btn);

        let ptstop_ui_btn = this.create_button('ptstop-btn', '../bootstrap/img/ptstop.png', 'Public Transport Zone');
        group2.appendChild(ptstop_ui_btn);
        this.button_ui_list.push(ptstop_ui_btn);

        let restrict_ui_btn = this.create_button('restrict-btn', '../bootstrap/img/restrict.png', 'Type Restriction Zone');
        group2.appendChild(restrict_ui_btn);
        this.button_ui_list.push(restrict_ui_btn);

        let survey_ui_btn = this.create_button('survey-btn', '../bootstrap/img/survey.png', 'Survey Zone Tool');
        group3.appendChild(survey_ui_btn);
        this.button_ui_list.push(survey_ui_btn);

        let landmark_ui_btn = this.create_button('landmark-btn', '../bootstrap/img/landmark.png', 'Landmark Tool');
        group3.appendChild(landmark_ui_btn);
        this.button_ui_list.push(landmark_ui_btn);

        let scale_ui_btn = this.create_button('scale-btn', '../bootstrap/img/scale.png', 'Scale Tool');
        group3.appendChild(scale_ui_btn);
        this.button_ui_list.push(scale_ui_btn);

    }

    create_button(id, src, tooltip){
        let button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.setAttribute('class', 'btn btn-default');
        button.setAttribute('id', id);
        button.setAttribute('title', tooltip);
        button.setAttribute('tooltiptext', tooltip);

        let img = document.createElement('img');
        img.setAttribute('src', src);
        img.setAttribute('class', 'img-toolbar');
        img.setAttribute('data-toggle', 'tooltip');
        img.setAttribute('data-placement', 'right');
        //img.setAttribute('title', tooltip);

        button.appendChild(img);
        return button;
    }

    /**
     * COMMENT
     * Creates toolbar buttons and connects them to the Control objects in Main.js
     */
    init_buttons(gc){
        this.default_control = app.select_control;
        let button_list = this.button_list;

        this.button_list.push(new Button(this, gc, this.default_control, app.uroad_create_control));
        this.button_ui_list[0].addEventListener('click', function(){button_list[0].click();});

        this.button_list.push(new Button(this, gc, this.default_control, app.iroad_create_control));
        this.button_ui_list[1].addEventListener('click', function(){button_list[1].click();});

        this.button_list.push(new Button(this, gc, this.default_control, app.set_conflict_area_control));
        this.button_ui_list[2].addEventListener('click', function(){button_list[2].click();});

        this.button_list.push(new Button(this, gc, this.default_control, app.stopsign_create_control));
        this.button_ui_list[3].addEventListener('click', function(){button_list[3].click();});

        this.button_list.push(new Button(this, gc, this.default_control, app.speed_limit_create_control));
        this.button_ui_list[4].addEventListener('click', function(){button_list[4].click();});

        this.button_list.push(new Button(this, gc, this.default_control, app.stoplight_create_control));
        this.button_ui_list[5].addEventListener('click', function(){button_list[5].click();});

        this.button_list.push(new Button(this, gc, this.default_control, app.pt_stop_create_control));
        this.button_ui_list[6].addEventListener('click', function(){button_list[6].click();});

        this.button_list.push(new Button(this, gc, this.default_control, app.type_restriction_create_control));
        this.button_ui_list[7].addEventListener('click', function(){button_list[7].click();});

        this.button_list.push(new Button(this, gc, this.default_control, app.survey_zone_create_control));
        this.button_ui_list[8].addEventListener('click', function(){button_list[8].click();});

        this.button_list.push(new Button(this, gc, this.default_control, app.landmark_create_control));
        this.button_ui_list[9].addEventListener('click', function(){button_list[9].click();});

        this.button_list.push(new Button(this, gc, this.default_control, app.set_scaling_control));
        this.button_ui_list[10].addEventListener('click', function(){button_list[10].click();});
    }

    reset_state(){
        this.button_list.forEach(function(b){
            b.is_active = false;
        });

        this.button_ui_list.forEach(function(u){
            u.classList.remove('active');
        });

    }

    change_button_state(button){
        this.button_list.forEach(function(b){
            if(b != button){
                b.is_active = false;
            }
        });
    }

    change_ui_state(button){
        this.button_ui_list.forEach(function(u){
            u.classList.remove('active');
        });


        for(let ctr=0; ctr<this.button_list.length; ctr++){
            if(button == this.button_list[ctr] && this.button_list[ctr].is_active){
                this.button_ui_list[ctr].classList.add('active');
            }
            else if(button == this.button_list[ctr] && !(this.button_list[ctr].is_active)){
                this.button_ui_list[ctr].classList.remove('active');
            }
        }
    }

}

class Button extends Signal{
    constructor(parent, gc=null, default_=null, active=null){
        super();
        this.events = ['change'];
        this.is_active = false;
        this.parent = parent;

        if(gc){
            this.gc = gc;
        }
        if(default_){
            this.default_ = default_;
        }
        if(active){
            this.active = active;
        }
    }

    click(){
        this.parent.change_button_state(this);
        this.is_active = !(this.is_active);

        if(this.is_active){
            this.gc.state = this.active;
        }
        else{
            this.gc.state = this.default_;
        }

        this.parent.change_ui_state(this);
        this.gc.vars.set('cached_conflict', null);
        this.fire('change');
    }
}