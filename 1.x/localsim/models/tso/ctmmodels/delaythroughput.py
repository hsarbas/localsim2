import docplex.mp.model as cpx
import pandas as pd
import time
from math import log10

from ctmmodels.const import *
from ctmmodels.nophasing import Constraint6Model
from ctmmodels.altphasing import Constraint6AltPhasingModel


class DelayThroughput(Constraint6Model):

    def __init__(self, normalize=True, flow_weight=0.2, use_flow_weight=False, *args, **kwargs):
        super(Constraint6Model, self).__init__(*args, **kwargs)
        self.normalize = normalize
        self.flow_weight = flow_weight
        self.use_flow_weight = use_flow_weight

    def generate_objective_fxn(self):
        # Capacities in all but the source and sink cells are full during maximum delay
        D_max = sum([ self.M[i] for i in self.set_C if i not in self.set_C_S + self.set_C_O for t in self.set_T ])

        # The volume in the source cell increases by the demand for each timestep
        D_max = D_max + sum([ self.d[(i,t)] for i in self.set_C_O for t in self.set_T ])

        # The volume in the sink cell indicates the throughput of the intersection
        T_max =  sum([ self.M[i] for i in self.set_C_S for t in self.set_T ])

        # The maximum flow in the cells
        F_max = sum([ self.F[i] for i in self.set_C if i not in self.set_C_S for t in self.set_T ])

        # To prevent loss of precision, we can scale up normalized results by the magnitude of the larger of the 2 values
        scale = 10**int(log10(max(D_max, T_max)))
        
        D_term = self.model.sum(
            self.model.sum(
                self.x_vars[(i,t)] - self.model.sum(
                    self.y_vars[(i,j,t)]
                    for j in self.S[i])
                for i in self.set_C if i not in self.set_C_S)
            for t in self.set_T)

        T_term = self.model.sum(
            self.model.sum(
                self.x_vars[(i,t)]
                for i in self.set_C_S)
            for t in self.set_T)

        F_term = self.model.sum(
            self.model.sum(
                self.model.sum(
                    self.y_vars[(i,j,t)]
                for j in self.S[i])
                for i in self.set_C if i not in self.set_C_S)
            for t in self.set_T)

        if (self.normalize):
            D_coeff = (float) (self.alpha * scale / D_max)
            T_coeff = (float) ((1 - self.alpha) * scale / T_max)
            F_coeff = (float) (self.flow_weight * scale / F_max)
        else:
            D_coeff = (float) (self.alpha)
            T_coeff = (float) (1 - self.alpha)
            F_coeff = (float) (self.flow_weight)

        if (self.use_flow_weight):
            self._objective = D_coeff*D_term - T_coeff*T_term - F_coeff*F_term
        else:
            self._objective = D_coeff*D_term - T_coeff*T_term


        self.model.minimize(self._objective)

    def generate(self):
        self.generate_sets()
        self.generate_parameters()
        self.generate_decision_vars()
        self.generate_constraints()
        self.generate_objective_fxn()


class DelayThroughputAltPhasing(Constraint6AltPhasingModel):

    def __init__(self, normalize=True, flow_weight=0.2, use_flow_weight=False, *args, **kwargs):
        super(Constraint6AltPhasingModel, self).__init__(*args, **kwargs)
        self.normalize = normalize
        self.flow_weight = flow_weight
        self.use_flow_weight = use_flow_weight

    def generate_objective_fxn(self):
        # Capacities in all but the source and sink cells are full during maximum delay
        D_max = sum([ self.M[i] for i in self.set_C if i not in self.set_C_S + self.set_C_O for t in self.set_T ])

        # The volume in the source cell increases by the demand for each timestep
        D_max = D_max + sum([ self.d[(i,t)] for i in self.set_C_O for t in self.set_T ])

        # The volume in the sink cell indicates the throughput of the intersection
        T_max =  sum([ self.M[i] for i in self.set_C_S for t in self.set_T ])

        # The maximum flow in the cells
        F_max = sum([ self.F[i] for i in self.set_C if i not in self.set_C_S for t in self.set_T ])

        # To prevent loss of precision, we can scale up normalized results by the magnitude of the larger of the 2 values
        scale = 10**int(log10(max(D_max, T_max)))
        
        D_term = self.model.sum(
            self.model.sum(
                self.x_vars[(i,t)] - self.model.sum(
                    self.y_vars[(i,j,t)]
                    for j in self.S[i])
                for i in self.set_C if i not in self.set_C_S)
            for t in self.set_T)

        T_term = self.model.sum(
            self.model.sum(
                self.x_vars[(i,t)]
                for i in self.set_C_S)
            for t in self.set_T)

        F_term = self.model.sum(
            self.model.sum(
                self.model.sum(
                    self.y_vars[(i,j,t)]
                for j in self.S[i])
                for i in self.set_C if i not in self.set_C_S)
            for t in self.set_T)

        if (self.normalize):
            D_coeff = (float) (self.alpha * scale / D_max)
            T_coeff = (float) ((1 - self.alpha) * scale / T_max)
            F_coeff = (float) (self.flow_weight * scale / F_max)
        else:
            D_coeff = (float) (self.alpha)
            T_coeff = (float) (1 - self.alpha)
            F_coeff = (float) (self.flow_weight)

        if (self.use_flow_weight):
            self._objective = D_coeff*D_term - T_coeff*T_term - F_coeff*F_term
        else:
            self._objective = D_coeff*D_term - T_coeff*T_term


        self.model.minimize(self._objective)

    def generate(self):
        self.generate_sets()
        self.generate_parameters()
        self.generate_decision_vars()
        self.generate_constraints()
        self.generate_objective_fxn()

    def return_objective_value(self):
        D_term = super(Constraint6AltPhasingModel, self).return_objective_value()

        T_term = sum(
            sum(
                self.x_vars[(i,t)].solution_value
                for i in self.set_C_S)
            for t in self.set_T)

        return (D_term, T_term)


class DelayThroughputSimplex(Constraint6AltPhasingModel):

    def __init__(self, normalize=True, beta=0, gamma=0, *args, **kwargs):
        super(DelayThroughputSimplex, self).__init__(*args, **kwargs)
        self.normalize = normalize
        self.beta = beta
        self.gamma = gamma

    def generate_objective_fxn(self):
        # Capacities in all but the source and sink cells are full during maximum delay
        D_max = sum([ self.M[i] for i in self.set_C if i not in self.set_C_S + self.set_C_O for t in self.set_T ])

        # The volume in the source cell increases by the demand for each timestep
        D_max = D_max + sum([ self.d[(i,t)] for i in self.set_C_O for t in self.set_T ])

        # The volume in the sink cell indicates the throughput of the intersection
        T_max =  sum([ self.M[i] for i in self.set_C_S for t in self.set_T ])

        # The maximum flow in the cells
        F_max = sum([ self.F[i] for i in self.set_C if i not in self.set_C_S for t in self.set_T ])

        # To prevent loss of precision, we can scale up normalized results by the magnitude of the larger of the 2 values
        scale = 10**int(log10(max(D_max, T_max, F_max)))
        
        D_term = self.model.sum(
            self.model.sum(
                self.x_vars[(i,t)] - self.model.sum(
                    self.y_vars[(i,j,t)]
                    for j in self.S[i])
                for i in self.set_C) # Won't make a difference on the y term, and will be more accurate for the x term
            for t in self.set_T)

        T_term = self.model.sum(
            self.model.sum(
                self.x_vars[(i,t)]
                for i in self.set_C_S)
            for t in self.set_T)

        F_term = self.model.sum(
            self.model.sum(
                self.model.sum(
                    self.y_vars[(i,j,t)]
                for j in self.S[i])
                for i in self.set_C if i not in self.set_C_S)
            for t in self.set_T)

        if (self.normalize):
            D_coeff = (float) (self.alpha * scale / D_max)
            T_coeff = (float) (self.beta * scale / T_max)
            F_coeff = (float) (self.gamma * scale / F_max)
        else:
            D_coeff = (float) (self.alpha)
            T_coeff = (float) (self.beta)
            F_coeff = (float) (self.gamma)

        self._objective = D_coeff*D_term - T_coeff*T_term - F_coeff*F_term
        self.model.minimize(self._objective)

    def generate(self):
        self.generate_sets()
        self.generate_parameters()
        self.generate_decision_vars()
        self.generate_constraints()
        self.generate_objective_fxn()

    def return_objective_value(self):
        D_term = super(DelayThroughputSimplex, self).return_objective_value()

        T_term = sum(
            sum(
                self.x_vars[(i,t)].solution_value
                for i in self.set_C_S)
            for t in self.set_T)

        Obj_value = self.model.objective_value

        return (D_term, T_term, Obj_value)