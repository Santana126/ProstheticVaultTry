export class Item {
    constructor(id, name, description, type, modelPath, visualData = {}) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.type = type;
        this.modelPath = modelPath;
        this.visualData = visualData;
    }
}