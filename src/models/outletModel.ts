class Outlet {
  o_id: any;
  o_name: any;
  o_u_id: any;
  o_tax: any;
  o_sc: any;
  o_created_at: any;
  o_updated_at: any;
  o_is_deleted: any;
  constructor(
    o_id: any,
    o_name: any,
    o_u_id: any,
    o_tax: any,
    o_sc: any,
    o_created_at: any,
    o_updated_at: any,
    o_is_deleted: any
  ) {
    this.o_id = o_id;
    this.o_name = o_name;
    this.o_u_id = o_u_id;
    this.o_tax = o_tax;
    this.o_sc = o_sc;
    this.o_created_at = o_created_at;
    this.o_updated_at = o_updated_at;
    this.o_is_deleted = o_is_deleted;
  }
}

module.exports = Outlet;
