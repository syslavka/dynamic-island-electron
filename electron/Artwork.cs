using System;
using System.Threading;
using System.Threading.Tasks;
using Windows.Storage.Streams;
using Windows.Foundation;
public static class IslandArtwork {
 public static Task<string> Read(RandomAccessStreamReference reference) {
  return Task.Run(() => {
   var open = reference.OpenReadAsync();
   while(open.Status == AsyncStatus.Started) Thread.Sleep(10);
   using (var stream = open.GetResults()) {
    if(stream.Size == 0 || stream.Size > 2097152) return null;
    using(var reader = new DataReader(stream.GetInputStreamAt(0))) {
     var load = reader.LoadAsync((uint)stream.Size);
     while(load.Status == AsyncStatus.Started) Thread.Sleep(10);
     load.GetResults();
     var bytes = new byte[(int)stream.Size]; reader.ReadBytes(bytes);
     return "data:" + stream.ContentType + ";base64," + Convert.ToBase64String(bytes);
    }
   }
  });
 }
}
