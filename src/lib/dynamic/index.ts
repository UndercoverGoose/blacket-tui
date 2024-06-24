type ReadResult<T> = {
  exists: boolean;
  value: T;
};

export class Dynamic<T extends Object> {
  static PATH_DIR = process.cwd() + '/.temp/';
  private store_path: string;
  private cache: T;
  constructor(store_name: string, default_data: T) {
    this.store_path = Dynamic.PATH_DIR + store_name;
    this.cache = default_data;
  }

  async setup(): Promise<T> {
    const res = await this.read();
    if (res.exists) {
      this.cache = res.value as T;
    }
    return new Proxy(this.cache, {
      set: (t, p, v) => {
        (t as any)[p] = v;
        this.write();
        return true;
      },
    });
  }
  private async write(): Promise<void> {
    await Bun.write(this.store_path, JSON.stringify(this.cache, null, 2));
  }
  private async read(): Promise<ReadResult<T | {}>> {
    const file = Bun.file(this.store_path);
    if (!(await file.exists())) {
      Bun.write(this.store_path, JSON.stringify(this.cache, null, 2));
      return {
        exists: false,
        value: this.cache,
      };
    }
    const json = await file.json();
    return {
      exists: true,
      value: json as T,
    };
  }
}
