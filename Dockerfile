FROM continuumio/anaconda

WORKDIR /usr/src/app

COPY requirements.txt ./
RUN pip install -r requirements.txt
RUN apt-get update
RUN apt-get install -y libgl1-mesa-glx

RUN conda remove -y qt
RUN conda install -y qt
RUN conda install -y pyqt
RUN conda install -y matplotlib

COPY ./1.x/ .

ENV PYTHONPATH "${PYTHONPATH}:."

CMD [ "python", "./localsim/main.py" ]
