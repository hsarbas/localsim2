from localsim.models import simulator, scene
from localsim.utils import signal, tools


class Simulator(object):
    def __init__(self):
        self.clock = None
        self.scene = None
        self.state = None
        self.simulator = None
        self.animated = None
        self.extras = {'los': [], 'quk': [], 'cvcc': [], 'stoplight': dict()}

    def reset(self):
        self.scene = scene.Scene()
        self.simulator = None

    def simulate(self, duration, routing_mode, ready=True):
        if ready:
            self.clock = signal.Clock(25, end=duration)
            self._extras_tempfix()
            self.scene.routing_mode = routing_mode
            self.simulator = simulator.Engine(self.clock, self.scene, uroad=self.extras['los'],
                                              uroad_survey=self.extras['quk'], iroad_survey=self.extras['cvcc'],
                                              stoplight=self.extras['stoplight'])
        else:
            self.simulator = None
            self.clock = None

    def _extras_tempfix(self):
        import weakref

        temp = []
        for i in self.scene.uroads:
            temp.append(i.label)
        # for i in self.scene.iroads:
        #     temp.append(i.label)
        self.extras['los'] = temp

        temp = []
        for road in self.scene.surveyors:
            for survey in self.scene.surveyors[road]:
                temp.append(weakref.ref(survey))

        self.extras['quk'] = temp
        self.extras['cvcc'] = temp

        temp = dict()
        for road in self.scene.controls:
            for i in self.scene.controls[road]:
                if i.__class__.__name__ == 'StopLight':
                    if i.road.label not in temp:
                        temp[i.road.label] = i
        self.extras['stoplight'] = temp

    def obtain_route_info(self):
        route_masterlist, valid_od_comb = self.scene.build_route_list()

        return route_masterlist, valid_od_comb
