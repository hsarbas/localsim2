class ConflictManager(object):

    def __init__(self, clock, scene, agent_manager):
        self.clock = clock
        self.scene = scene
        self.conflict_zones = scene.conflict_zones
        self.agent_manager = agent_manager

        self.agent_manager.connect('new_agent', self._new_agent_callback)
        self.clock.connect('fine', self._clock_signal_callback)

    def _new_agent_callback(self, event, source, **kwargs):
        if 'agent' in kwargs:
            kwargs['agent'].connect('intention_enter', self._agent_intention_enter_callback)
            kwargs['agent'].connect('intention_exit', self._agent_intention_exit_callback)

    def _clock_signal_callback(self, event, source, **kwargs):
        for value in self.conflict_zones.values():
            if value:
                zone = value[0]

                if not self.agent_manager.members(zone.road):
                    zone.locked = False

    def _agent_intention_enter_callback(self, event, source, **kwargs):
        road = kwargs['road']
        conflict_group = kwargs['group']
        gap = kwargs['gap']
        zone = self.scene.conflict_zones[road][0]

        for group in conflict_group:
            conflict_neighborhood = self.scene.get_confzones_by_confgroup(group)
            if zone in conflict_neighborhood:
                conflict_neighborhood.remove(zone)

            # for _c_zone in conflict_neighborhood:
            #     if not self.agent_manager.members(_c_zone.road) and not zone.locked:
            #         _c_zone.locked = True

            for _c_zone in conflict_neighborhood:
                if not self.agent_manager.members(_c_zone.road) and not zone.locked:
                    if road.priority == _c_zone.road.priority or road.priority == 'major' or gap <= 20.0:
                        _c_zone.locked = True

    def _agent_intention_exit_callback(self, event, source, **kwargs):
        road = kwargs['road']
        conflict_group = kwargs['group']
        zone = self.scene.conflict_zones[road][0]

        for group in conflict_group:
            conflict_neighborhood = self.scene.get_confzones_by_confgroup(group)
            if zone in conflict_neighborhood:
                conflict_neighborhood.remove(zone)

            for _c_zone in conflict_neighborhood:
                _c_zone.locked = False
