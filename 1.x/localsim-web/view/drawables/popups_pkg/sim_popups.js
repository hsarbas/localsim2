class SimulationPopup{
    constructor(){

    }

    show(gc){
        this.gc = gc;
        this.scene = gc.scene;
        this.modal = $('#play');
        this.value = null;

        this.animated_option = $('#play-animation');
        this.runs = $('#play-runs');
        this.duration = $('#play-duration');

        this.runs.val(1);

        this.modal.modal();
    }

    do_(){
        let animated = this.animated_option[0].checked;
        //let runs = Number(this.runs.val());
        let runs = 1;
        let duration = Number(this.duration.val());

        let ret = this.scene.valid_road_lengths();
        if(ret[0] == true){
            if(check_int(runs) && runs > 0){
                if(check_int(duration) && this.valid_sim_time(duration)){
                    this.value = [animated, runs, duration * 100];
                    this.modal.modal('hide');
                }
                else{
                    alert(SIMULATION_TIME_ERROR);
                    this.duration.focus();
                }
            }
            else{
                alert(RUNS_ERROR);
                this.runs.focus();
            }

            if(this.value){
                this.gc.change_menu_state(TOOLBAR, TOOLBAR_BUTTONS, DISABLED);
                this.gc.change_menu_state(NAVBAR, NAV_DISABLE_ON_PLAY, DISABLED);
                this.gc.change_menu_state(NAVBAR_PAUSE_STOP, PAUSE_STOP, ENABLED);
                app.glue_code(this.value[0], this.value[1], this.value[2]);
            }
        }
        else{
            alert(UROAD_LENGTHS_ERROR + ret[1]);
        }
    }

    valid_sim_time(duration){
        return (duration >= 1 && duration <= 30000);
    }
}

class PlayProgressPopup{
    constructor(){

    }

    show(){
        this.modal = $('#play-progress');
        this.modal.modal();
    }

    hide(){
        this.modal.modal('hide');
    }
}

class LoadProgressPopup{
    constructor(){

    }

    show(){
        this.modal = $('#load-progress');
        this.modal.modal();
    }

    hide(){
        this.modal.modal('hide');
    }
}

class OutputPopup{
    constructor(){

    }

    show(){
        this.modal = $('#output');
        this.filename = $('#output-filename');
        this.filename.val('');
        //
        //let period = $('#output-period');
        //let agents = $('#output-agents');
        //let destination = $('#output-destination');
        //let ave_speed = $('#output-ave-speed');
        //let ave_time = $('#output-ave-time');
        //
        //let summary = app.summary;
        //
        //period.val(parseInt(summary.get('Observation period (s)').Values));
        //ave_speed.val(summary.get('Average speed (kph)').Values);
        //ave_time.val(summary.get('Average travel time (s)').Values);

        this.modal.modal();
    }

    do_(){
        //let filename = this.filename.val();
        //if(this.valid_filename(filename)){
        //    //TODO clear anchor after click
        //    // const raw = 'EXT ' + filename + '.xls \r\n NULL';
        //    const raw = 'EXT result.xls \r\n NULL';
        //    $.post("/main.html", raw, function(data){
        //    // let a = '<a href=\"/tmp/' + filename + '\" id=\"aaa\" download>a</a>';
        //        let _fname = "/tmp/result" + app.rand + ".xls";
        //        let a = '<a href=_fname id="aaa" download>a</a>';
        //        $('#save-link').prepend(a);
        //        $('#aaa')[0].click();
        //    });
        //
        //    this.modal.modal('hide');
        //}
        //
        //else{
        //    alert('Invalid Filename.');
        //    this.filename.focus();
        //}
        let _fname = "/tmp/result" + app.rand + ".xls";
        //let a = '<a href=_fname id="aaa" download>a</a>';
        //let a = '<a href="/tmp/result.xls" id="aaa" download>a</a>';
        //$('#save-link').prepend(a);
        document.getElementById('dl-link').setAttribute('href', _fname);
        $('#dl-link')[0].click();
        this.modal.modal('hide');

    }

    valid_filename(filename){
        return !(filename == '');

    }

}