class User {
  u_id: any;
  u_email: any;
  u_type: any;
  u_created_at: any;
  u_updated_at: any;
  u_is_deleted: any;
  constructor(
    u_id: any,
    u_email: any,
    u_type: any,
    u_created_at: any,
    u_updated_at: any,
    u_is_deleted: any
  ) {
    this.u_id = u_id;
    this.u_email = u_email;
    this.u_type = u_type;
    this.u_created_at = u_created_at;
    this.u_updated_at = u_updated_at;
    this.u_is_deleted = u_is_deleted;
  }
}

module.exports = User;
