using MediaBrowser.Common.Plugins;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Model.Serialization;
using MediaBrowser.Model.Plugins;
namespace Jellyfin.Plugin.EnhancedGuide;
public sealed class Configuration : BasePluginConfiguration {}
public sealed class Plugin : BasePlugin<Configuration>
{
    public Plugin(IApplicationPaths paths, IXmlSerializer serializer) : base(paths, serializer) {}
    public override string Name => "Enhanced Guide";
    public override Guid Id => Guid.Parse("aeea3bf9-b271-43a0-880e-ef18c9789723");
}