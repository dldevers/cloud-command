export class World {
  constructor() {
    this.objects = [];
    this.relationships = [];
  }

  addObject(object) {
    this.objects.push(object);
    return object;
  }

  addRelationship(fromId, toId, type = "default") {
    this.relationships.push({
      fromId,
      toId,
      type,
    });
  }

  getObject(id) {
    return this.objects.find((object) => object.id === id);
  }

  clear() {
    this.objects = [];
    this.relationships = [];
  }

  seedDemoObjects() {
    this.clear();

    this.addObject({
      id: "cluster-1",
      kind: "cluster",
      label: "Production",
      x: 0,
      y: 0,
      health: "healthy",
    });

    this.addObject({
      id: "ns-cloudcommand",
      kind: "namespace",
      label: "cloudcommand",
      x: -220,
      y: -120,
      health: "healthy",
    });

    this.addObject({
      id: "ns-production",
      kind: "namespace",
      label: "production",
      x: 220,
      y: -40,
      health: "warning",
    });

    this.addObject({
      id: "app-payments",
      kind: "application",
      label: "payments",
      x: 260,
      y: 160,
      health: "critical",
    });

    this.addObject({
      id: "app-api",
      kind: "application",
      label: "api",
      x: -180,
      y: 180,
      health: "healthy",
    });

    this.addRelationship("cluster-1", "ns-cloudcommand");
    this.addRelationship("cluster-1", "ns-production");
    this.addRelationship("ns-production", "app-payments");
    this.addRelationship("ns-cloudcommand", "app-api");
  }
}
