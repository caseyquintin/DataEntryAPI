using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("FPMs")]
public class Fpm
{
    [Key]
    public int FpmID { get; set; }

    [Column("Fpm")]
    public string FpmName { get; set; } = string.Empty;

    [Column("Active")]
    public int Active { get; set; }

}