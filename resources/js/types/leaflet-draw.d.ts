import * as L from 'leaflet';

declare module 'leaflet' {
  namespace Control {
    class Draw extends Control {
      constructor(options?: any);
    }
  }

  namespace DrawEvent {
    interface Created {
      layer: L.Layer;
      layerType: string;
    }
  }

  interface Map {
    on(type: 'draw:created', fn: (e: DrawEvent.Created) => void): this;
    on(type: 'draw:drawstart', fn: () => void): this;
  }
}
